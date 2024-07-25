import { WebSocketServer } from 'ws';

/**
 * Handler for messsages from libp2p and websocket channels. It proxes msgs from
 * libp2p to websocket clients and msgs from websocket clients to libp2p nodes.
 * @param  libp2pManager Instance of the Libp2pManager class.
 * @param logger Instance of the Logger class.
 */
export class WebSocketManager {
  constructor(messageHandler, logger, node) {
    this.wsServer = this.#createWebsocketServer();
    this.messageHandler = messageHandler;
    this.clientIdCounter = 1;
    this.clients = new Map();
    this.logger = logger;
    this.node = node;
  }

  /**
   * Creates websocket server.
   * @returns Instance of the server.
   */
  #createWebsocketServer() {
    const port = 8888;
    const wss = new WebSocketServer({ port }, () => {
      this.logger.INFO(`WebSocket server listening on port ${port}`);
    });
    return wss;
  }

  /**
   * Updates client metadata with.
   * @param ws Instance of ws connection.
   * @param newInfo Info to add.
   */
  updateClientInfo(ws, newInfo) {
    if (this.clients.has(ws)) {
      const currentInfo = this.clients.get(ws);
      this.clients.set(ws, { ...currentInfo, ...newInfo });
    }
  }

  /**
   * Sets a client metadata.
   * @param ws Instance of ws connection.
   * @param req Incoming message.
   */
  #setClient(ws, req) {
    const clientId = this.clientIdCounter++;
    const clientInfo = {
      id: clientId,
      address: req.socket.remoteAddress,
      port: req.socket.remotePort,
    };
    this.clients.set(ws, clientInfo);
  }

  /**
   * Handler for a connection.
   * @param ws Instance of ws connection.
   * @param newInfo Info to add.
   */
  onConnectionManager() {
    this.wsServer.on('connection', (ws, req) => {
      this.#setClient(ws, req);

      const multiAddresses = this.node.getMultiaddrs().map((addr) => addr.toString());
      this.messageHandler.sendMsg2WSClients(
        this.wsServer,
        this.clients,
        { peerId: this.node.peerId.toString(), multiAddresses },
      );
      ws.on('error', console.error);
      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data);

          if ('protocols_to_listen' in msg) {
            this.updateClientInfo(ws, { protocolsToListen: msg.protocols_to_listen });
            this.messageHandler.onWSInitialMessage(msg, this.wsServer, this.clients, this.node);
          } else {
            this.messageHandler.onWSMessage(msg, this.node, ws);
          }
        } catch (error) {
          this.logger.ERROR(error, 'onConnectionManager');
        }
      });
    });
  }
}
