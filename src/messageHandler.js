import WebSocket from 'ws';
import fs from 'fs/promises';
import dotenv from 'dotenv';
import { saveMsg2File } from '../utils/saveData.js';

dotenv.config();

/**
 * Handler for messsages from libp2p and websocket channels. It proxes msgs from
 * libp2p to websocket clients and msgs from websocket clients to libp2p nodes.
 * @param  libp2pManager Instance of the Libp2pManager class.
 * @param logger Instance of the Logger class.
 */
export class MessageHandler {
  constructor(libp2pManager, logger) {
    this.libp2pManager = libp2pManager;
    this.logger = logger;
    this.registeredProtocols = new Set();
    this.messageQueue = [];
  }

  /**
   * Sends the message tothe  ws clients. If protocol parameter is
   * set, he message will be sent only to these clients who are listening to this protocol.
   * @param  msg The message to proxy.
   * @param  protocol Libp2p protocol from which the message originated.
   * @param wsServer Instance of the websocket server.
   * @param wsClients Map of all the ws clients.
   */
  sendMsg2WSClients(wsServer, wsClients, msg, protocol = undefined) {
    // eslint-disable-next-line no-restricted-syntax
    for (const client of wsServer.clients) {
      if (protocol) {
        const clientProtocols = wsClients.get(client).protocolsToListen;
        if (!clientProtocols.includes(protocol)) {
          return;
        }
      }
      if (client.readyState === WebSocket.OPEN) {
        const msgWithProtocol = { ...msg, protocol };
        client.send(JSON.stringify(msgWithProtocol));
        this.logger.INFO('Message has been sent to ws client');
      }
    }
  }

  /**
   * Proxies messages from Libp2p clients to websocket clients.
   * @param  msg The message to proxy.
   * @param  protocol Libp2p protocol from which the message originated.
   * @param wsServer Instance of the websocket server.
   * @param wsClients Map of all the ws clients.
   */
  #proxyLibp2pMsg2WS(msg, protocol, wsServer, wsClients) {
    this.sendMsg2WSClients(wsServer, wsClients, msg, protocol);
  }

  /**
   * Sends saved messages to a new connected libp2p client.
   * @param connectedPeerId Peer id of the new client.
   * @param node Instance of the libp2p node.
   */
  async sendSavedMsg(connectedPeerId, node) {
    const directoryPath = process.env.SAVED_DATA_DIR_PATH;
    try {
      const files = await fs.readdir(directoryPath);
      files.forEach(async (file) => {
        const fileContent = await fs.readFile(`${directoryPath}/${file}`, 'utf-8');
        const msg = JSON.parse(fileContent);
        const connection = this.libp2pManager.findConnectionByPeerId(node, connectedPeerId);
        this.libp2pManager.sendMsg(connection, msg.data, msg.protocol);
      });
    } catch (error) {
      this.logger.ERROR(error, 'sendSavedMsg');
    }
  }

  processMessageQueue() {
    if (this.messageQueue.length > 0) {
      const msg = this.messageQueue.shift();
      saveMsg2File(msg, this.logger);
      this.processMessageQueue();
    }
  }

  /**
   * Handler for an initial message from a WebSocket client. It stores from which libp2p protocol
   * this client wants to get messages and opens a corresponding libp2p handler for each of one.
   * @param  msg The message from ws client.
   * @param wsServer Instance of the websocket server.
   * @param wsClients Map of all the ws clients.
   * @param node Instance of the libp2p node.
   */
  onWSInitialMessage(msg, wsServer, wsClients, node) {
    const protocols = msg.protocols_to_listen;
    protocols.forEach((protocol) => {
      if (!this.registeredProtocols.has(protocol)) {
        this.libp2pManager.handle(node, protocol, async (data, stream) => {
          await this.libp2pManager.sendResponse(stream, { result: true });
          this.#proxyLibp2pMsg2WS(data, protocol, wsServer, wsClients);
        });
        this.registeredProtocols.add(protocol);
      }
    });
  }

  /**
   * Handler for a message from a WebSocket client, pproxied to the specific
   * Libp2p server; otherwise, it is broadcasted to all Libp2p clients.
   * @param  msg The message from the ws client.
   * @param node Instance of libp2p node
   */
  onWSMessage(msg, node) {
    this.logger.INFO('Sending msg from ws to libp2p...');
    const { protocol } = msg;
    const { serverPeerId } = msg;

    if (msg.save_data) {
      this.messageQueue.push(msg);
      this.processMessageQueue();
    }

    if (serverPeerId) {
      if (this.libp2pManager.findConnectionByPeerId(node, serverPeerId)) {
        const connection = this.libp2pManager.findConnectionByPeerId(node, serverPeerId);
        this.libp2pManager.sendMsg(connection, msg.data, protocol);
      } else {
        this.libp2pManager.connect2NodeViaRelay(node, serverPeerId).then((connection) => {
          this.libp2pManager.sendMsg(connection, msg.data, protocol);
        }).catch((error) => { this.logger.ERROR(error, "onWSMessage couldn't resolve promise"); });
      }
    } else {
      node.getConnections().forEach((connection) => {
        this.libp2pManager.sendMsg(connection, msg.data, protocol);
      });
    }
  }
}
