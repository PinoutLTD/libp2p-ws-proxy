import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { circuitRelayTransport } from "@libp2p/circuit-relay-v2";
import { identify } from "@libp2p/identify";
import { ping } from "@libp2p/ping";
import { tcp } from "@libp2p/tcp";
import { getNetConfig, lpStream } from "@libp2p/utils";
import { webRTCDirect } from "@libp2p/webrtc";
import { webSockets } from "@libp2p/websockets";
import { multiaddr } from "@multiformats/multiaddr";
import { createLibp2p } from "libp2p";
import { ConfigurationManager } from "./utils/configurationManager.js";
import { getLocalIps } from "./utils/host.js";
import { logger } from "./utils/logger.js";

/**
 * Libp2p manager. Contains all methods that are used for libp2p communication.
 */
export class Libp2pManager {
  constructor() {
    this.configuration = new ConfigurationManager();
    this.node = undefined;
    this.feedbackManager = undefined;
    this.realayAddress = [];
    this.#setRelays();
  }

  setFeedbackManager(feedbackManager) {
    this.feedbackManager = feedbackManager;
  }

  #setRelays() {
    const config = this.configuration.load();
    if (config.relays) {
      for (const addr of config.relays) {
        this.realayAddress.push(multiaddr(addr));
      }
    }
  }

  findRelayAddress(peerId) {
    for (const addr of this.realayAddress) {
      if (addr.getComponents().find(item => item.value === peerId)) {
        return addr;
      }
    }
    return false;
  }

  async connectRelay(addr) {
    try {
      logger.INFO(`Dial to the relay ${addr.toString()}`);
      const connection = await this.node.dial(addr);
      logger.INFO(`Connected to the relay ${connection.remotePeer.toString()}`);
      return connection;
    } catch (error) {
      logger.ERROR(error, "connectRelay");
    }
    return false;
  }

  async connectRelays() {
    for (const addr of this.realayAddress) {
      await this.connectRelay(addr);
    }
  }

  reconnectRelay(addr) {
    let attempt = 0;
    const maxAttempts = 5;
    const retryInterval = 5000; // 5 seconds
    const extendedInterval = 30 * 60 * 1000; // 30 minutes

    const start = async () => {
      while (attempt < maxAttempts) {
        attempt++;
        const connection = await this.connectRelay(addr);
        if (connection) {
          logger.INFO("Reconnected successfully");
          return;
        }
        logger.INFO(
          `Reconnection attempt ${attempt} failed. Retrying in ${
            retryInterval / 1000
          } seconds...`
        );
        await new Promise(resolve => {
          setTimeout(resolve, retryInterval);
        });
      }
      logger.INFO(
        `All ${maxAttempts} reconnection attempts failed. Waiting for ${
          extendedInterval / 60000
        } minutes before retrying...`
      );
      attempt = 0;
      setTimeout(start, extendedInterval);
    };

    start();
  }

  /**
   * Connects to the peerId via relay node.
   * @param peerId Peer Id of the node to connect.
   * @returns Connection promise.
   */
  async connect2NodeViaRelay(peerId) {
    for (const addr of this.realayAddress) {
      try {
        const address = `${addr.toString()}/p2p-circuit/p2p/${peerId}`;
        const connection = await this.node.dial(multiaddr(address));
        if (connection.status === "open") {
          return connection;
        }
      } catch (error) {
        logger.ERROR(error, "connect2NodeViaRelay");
      }
    }
    return false;
  }

  /**
   * Finds connection with a specific peerId and returns it. If no such
   * connection is found, it returns false.
   * @param peerId Peer Id of the desired node.
   * @returns Connection object or false.
   */
  findConnectionByPeerId(peerId) {
    const connection = this.node
      .getConnections()
      .find(conn => peerId === conn.remotePeer.toString());
    if (connection) {
      logger.INFO(`PeerId ${peerId} connected.`);
    }
    return connection || false;
  }

  /**
   * Creates instance of a libp2p node.
   * @returns Instance of the libp2p node.
   */
  async createNode() {
    const localIps = getLocalIps();
    const appendAnnounceAddrs = localIps.flatMap(ip => [
      `/ip4/${ip}/tcp/9988`,
      `/ip4/${ip}/tcp/9999/ws`,
      `/ip4/${ip}/udp/9977/webrtc-direct`
    ]);
    const config = this.configuration.load();
    const noAnnounceAddrs = config.noAnnounce || [];
    logger.INFO(`noAnnounce ${JSON.stringify(noAnnounceAddrs, null, 2)}`);

    const noAnnounceConfigAddrs = noAnnounceAddrs.map(addr =>
      getNetConfig(multiaddr(addr))
    );

    const privateKey = await this.configuration.loadOrGeneratePeerId();
    this.node = await createLibp2p({
      start: false,
      privateKey,
      addresses: {
        listen: [
          "/ip4/0.0.0.0/tcp/9988",
          "/ip4/0.0.0.0/tcp/9999/ws",
          "/ip4/0.0.0.0/udp/9977/webrtc-direct",
          "/p2p-circuit"
        ],
        announceFilter: addrs => {
          if (!noAnnounceConfigAddrs || noAnnounceConfigAddrs.length === 0) {
            return addrs;
          }
          return addrs.filter(addr => {
            const addrConfig = getNetConfig(addr);
            const is = noAnnounceConfigAddrs.find(noAddr => {
              if (
                noAddr.type === addrConfig.type &&
                noAddr.host === addrConfig.host &&
                noAddr.protocol === addrConfig.protocol &&
                noAddr.port === addrConfig.port
              ) {
                return true;
              }
              return false;
            });
            return !is;
          });
        },
        appendAnnounce: appendAnnounceAddrs
      },
      transports: [
        tcp(),
        webSockets(),
        webRTCDirect(),
        circuitRelayTransport()
      ],
      streamMuxers: [yamux()],
      connectionEncrypters: [noise()],
      services: {
        identify: identify(),
        ping: ping()
      }
    });
    return this.node;
  }

  /**
   * Reads from the stream.
   * @returns JSON message.
   */
  async #getRequest({ lp, stream }) {
    return Promise.resolve()
      .then(async () => {
        const req = await lp.read();
        return JSON.parse(new TextDecoder().decode(req.subarray()));
      })
      .catch(error => {
        stream.abort(error);
        logger.ERROR(error.message, "#getRequest");
        return "";
      });
  }

  /**
   * Sends response to the stream.
   */
  async sendResponse({ lp, stream }, msg) {
    await lp.write(new TextEncoder().encode(JSON.stringify(msg)));
    stream.close();
  }

  /**
   * Handle messages for the protocol.
   */
  handle(protocol, fn) {
    return this.node.handle(protocol, async stream => {
      const lp = lpStream(stream);
      fn(await this.#getRequest({ lp, stream }), { lp, stream });
    });
  }

  /**
   * Creates new stream for the protocol and send the data
   * to the stream.
   */
  async #request(connection, protocol, data) {
    const stream = await connection.newStream([protocol], {
      runOnTransientConnection: true
    });
    const lp = lpStream(stream);
    await lp.write(new TextEncoder().encode(JSON.stringify(data)));
    const res = await lp.read();
    return JSON.parse(new TextDecoder().decode(res.subarray()));
  }

  /**
   * Checks if the remote address of a connection is
   * the relay address.
   * @returns Boolean
   */
  #isConnectionNotRelay(remoteAddress) {
    return remoteAddress === this.realayAddress.toString();
  }

  /**
   * Sends message to the node.
   * @param connection Connection with the node.
   * @param data Message to send.
   * @param protocol Name of the Libp2p protocol.
   */
  async sendMsg(connection, data, protocol, ws) {
    try {
      const isRelay = this.#isConnectionNotRelay(
        connection.remoteAddr.toString()
      );
      if (!isRelay) {
        const response = await this.#request(connection, protocol, data);
        logger.INFO(`Sending message to ${connection.remoteAddr.toString()}`);
        logger.INFO(response, " got response from sendMsg");
        if (!(typeof ws === "undefined")) {
          this.feedbackManager.sendFeedbackMessage("ok", ws);
        }
      }
    } catch (error) {
      logger.ERROR(error.message, "sendMsg");
      if (ws) {
        this.feedbackManager.sendFeedbackMessage(error.message, ws);
      }
    }
  }

  getConnections() {
    return this.node.getConnections();
  }

  unhandleProtocol(protocol) {
    try {
      logger.INFO(`unhandle protocol ${protocol}`);
      this.node.unhandle(protocol);
    } catch (error) {
      logger.ERROR(error.message, "unhandleProtocol");
    }
  }
}
