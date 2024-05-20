/* eslint-disable class-methods-use-this */
import { noise } from '@chainsafe/libp2p-noise';
import { mplex } from '@libp2p/mplex';
import { webSockets } from '@libp2p/websockets';
import { pipe } from 'it-pipe';
import { createLibp2p } from 'libp2p';
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string';
import { toString as uint8ArrayToString } from 'uint8arrays/to-string';
import { circuitRelayTransport } from 'libp2p/circuit-relay';
import { identifyService } from 'libp2p/identify';
import { multiaddr } from '@multiformats/multiaddr';
import { ConfigurationManager } from '../utils/configurationManager.js';

/**
 * Libp2p manager. Contains all methods that are used for libp2p communication.
 * @param logger Instance of the Logger class.
 */
export class Libp2pManager {
  constructor(logger) {
    this.configuration = new ConfigurationManager(logger);
    this.realayAddress = '/dns4/libp2p-relay-1.robonomics.network/tcp/443/wss/p2p/12D3KooWEMFXXvpZUjAuj1eKR11HuzZTCQ5HmYG9MNPtsnqPSERD';
    this.logger = logger;
  }

  /**
   * Connects to the peerId via relay node.
   * @param node Instance of the libp2p node.
   * @param peerId Peer Id of the node to connect.
   * @returns Connection promise.
  */
  connect2NodeViaRelay(node, peerId) {
    const address = `${this.realayAddress}/p2p-circuit/p2p/${peerId}`;
    return node.dial(multiaddr(address))
      .then((connection) => connection)
      .catch((error) => {
        this.logger.ERROR(error, 'connect2NodeViaRelay');
      });
  }

  /**
   * Finds connection with a specific peerId and returns it. If no such
   * connection is found, it returns false.
   * @param node Instance of the libp2p node.
   * @param peerId Peer Id of the desired node.
   * @returns Connection object or false.
  */
  findConnectionByPeerId(node, peerId) {
    const connection = node.getConnections().find(
      (conn) => peerId === conn.remotePeer.toString(),
    );
    if (connection) {
      this.logger.INFO(`PeerId ${peerId} connected.`);
    }
    return connection || false;
  }

  /**
   * Creates instance of a libp2p node.
   * @returns Instance of the libp2p node.
  */
  async createNode() {
    const peerId = await this.configuration.loadOrGeneratePeerId();
    const node = await createLibp2p({
      peerId,
      addresses: {
        listen: ['/ip4/0.0.0.0/tcp/9999/ws'],
      },
      transports: [
        webSockets(),
        circuitRelayTransport({
          discoverRelays: 1,
        }),
      ],
      streamMuxers: [
        mplex(),
      ],
      connectionEncryption: [
        noise(),
      ],
      services: {
        identify: identifyService(),
      },

    });
    return node;
  }

  /**
   * Reads from the stream.
   * @returns JSON message.
  */
  async #getRequest(stream) {
    return pipe(
      stream,
      async (source) => {
        let result = '';
        // eslint-disable-next-line no-restricted-syntax
        for await (const data of source) {
          result += uint8ArrayToString(data.subarray());
        }
        try {
          return JSON.parse(result);
        } catch (error) {
          this.logger.ERROR(error.message, '#getRequest');
          return result;
        }
      },
    );
  }

  /**
   * Sends response to the stream.
  */
  async sendResponse(stream, msg) {
    return pipe(
      [uint8ArrayFromString(JSON.stringify(msg))],
      stream.sink,
    ).finally(() => {
      stream.close();
    });
  }

  /**
   * Handle messages for the protocol.
  */
  handle(node, protocol, fn) {
    return node.handle(protocol, async ({ stream }) => {
      fn(await this.#getRequest(stream), stream);
    }, { runOnTransientConnection: true });
  }

  /**
   * Creates new stream for the protocol and send the data
   * to the stream.
  */
  async #request(connection, protocol, data) {
    if (connection.status !== 'open') {
      return {};
    }
    const stream = await connection.newStream([protocol], {
      runOnTransientConnection: true,
    });
    return pipe(
      [uint8ArrayFromString(JSON.stringify(data))],
      stream,
      async (source) => {
        let result = '';
        // eslint-disable-next-line no-restricted-syntax
        for await (const msg of source) {
          result += uint8ArrayToString(msg.subarray());
        }
        try {
          return JSON.parse(result);
        } catch (error) {
          this.logger.ERROR(error.message, '#request');
          return result;
        }
      },
    );
  }

  /**
   * Checks if the remote address of a connection is
   * the relay address.
   * @returns Boolean
  */
  #isConnectionNotRelay(remoteAddress) {
    return remoteAddress === this.realayAddress;
  }

  /**
   * Sends message to the node.
   * @param connection Connection with the node.
   * @param data Message to send.
   * @param protocol Name of the Libp2p protocol.
  */
  async sendMsg(connection, data, protocol) {
    try {
      const isRelay = this.#isConnectionNotRelay(connection.remoteAddr.toString());
      if (!isRelay) {
        const response = await this.#request(connection, protocol, data);
        this.logger.INFO(`Sending message to ${connection.remoteAddr.toString()}`);
        this.logger.INFO(response, ' got response from sendMsg');
      }
    } catch (error) {
      this.logger.ERROR(error.message, 'sendMsg');
    }
  }

  unhandleProtocol(node, protocol) {
    try {
      this.logger.INFO(`unhandle protocol ${protocol}`);
      node.unhandle(protocol);
    } catch (error) {
      this.logger.ERROR(error.message, 'unhandleProtocol');
    }
  }
}
