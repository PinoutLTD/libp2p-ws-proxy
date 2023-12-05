import { WebSocketServer } from 'ws';
import WebSocket from 'ws';
import dotenv from 'dotenv';

dotenv.config();

export class WebSocketManager {
    constructor(messageManager) {
        this.wsServer = this.#createWebsocketServer()
        this.messageManager = messageManager
        this.clientIdCounter = 1
        this.clients = new Map()
    }

    #createWebsocketServer() {
        const port = Number(process.env.PORT)
        const wss = new WebSocketServer({ port: port }, () => {
            console.log(`WebSocket server listening on port ${port}`);
        });
        return wss
    }

    updateClientInfo(ws, newInfo) {
      if (this.clients.has(ws)) {
        const currentInfo = this.clients.get(ws);
        this.clients.set(ws, { ...currentInfo, ...newInfo });
      } 
    }

    onConnectionManager(node) {
      this.wsServer.on('connection', (ws, req) => {
        const clientId = this.clientIdCounter++
        const clientInfo = {
              id: clientId,
              address: req.socket.remoteAddress,
              port: req.socket.remotePort,
          }
        this.clients.set(ws, clientInfo)

          this.wsServer.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              const peerIdMsg = JSON.stringify({ "peerId": node.peerId.toString() })
              client.send(peerIdMsg);
              console.log("PeerId sent")
            }
          });
          ws.on('error', console.error);
      
          ws.on('message', (data) => {
            try {
              const msg = JSON.parse(data)
              console.log(`Received message from Client ${clientId}:`, msg);
              
              if ("protocols_to_listen" in msg) {
                this.updateClientInfo(ws, { protocolsToListen: msg.protocols_to_listen })
                this.messageManager.onWSInitialMessage(msg, this.wsServer, this.clients)
              } else {
                this.messageManager.onWSMessage(msg, node)
              }
            }
            catch (error) {
              console.error(error);
            }
          });
      })
    }  
}