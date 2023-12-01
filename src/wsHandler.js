import { WebSocketServer } from 'ws';
import WebSocket from 'ws';
import dotenv from 'dotenv';

dotenv.config();

export class WebSocketManager {
    constructor(libp2pManager) {
        this.wsServer = this.#createWebsocketServer()
        this.libp2pManager = libp2pManager
        this.clientIdCounter = 1
        this.clients = new Map()
    }

    #createWebsocketServer() {
        const port = Number(process.env.PORT)
        console.log(process.env.PORT)
        const wss = new WebSocketServer({ port: port }, () => {
            console.log(`WebSocket server listening on port ${port}`);
        });
        return wss
    }

    #updateClientInfo(ws, newInfo) {
      if (this.clients.has(ws)) {
        const currentInfo = this.clients.get(ws);
        this.clients.set(ws, { ...currentInfo, ...newInfo });
      } 
    }

    #proxyLibp2pMsg2WS(msg, protocol) {
      this.wsServer.clients.forEach((client) => {
        const clientProtocols = this.clients.get(client).protocolsToListen
        if (clientProtocols.includes(protocol)) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(msg));
            console.log("Sent msg to ws")
          }
        }
      })
    }


    #onInitialMessage(msg, ws, node) {
      this.#updateClientInfo(ws, { protocolsToListen: msg.protocols_to_listen });
      const protocols = msg.protocols_to_listen
      protocols.forEach((protocol) => {
        this.libp2pManager.handle(node, protocol, async (msg, stream) => {
          await this.libp2pManager.sendResponse(stream, { result: true })
          this.#proxyLibp2pMsg2WS(msg, protocol)
        })
      })   
    }

    #onMessage(msg, node) {
      console.log("Sending msg from ws to libp2p...")
      const protocol = msg.protocol
      const serverPeerId = msg.serverPeerId
      if (serverPeerId) {
        if (this.libp2pManager.checkConnectionByPeerId(node, serverPeerId)) {
          const connection = this.libp2pManager.checkConnectionByPeerId(node, serverPeerId)
          this.libp2pManager.sendMsg(connection, msg.data, protocol)
        } else {
            this.libp2pManager.connect2NodeViaRelay(node, serverPeerId).then(connection => {
              this.libp2pManager.sendMsg(connection, msg.data, protocol)
            }).catch(error => {console.log("Error in resolving connection promise", error)})
        }   
      } else {
        for (const connection of node.getConnections()) {
          this.libp2pManager.sendMsg(connection, msg.data, protocol)
        }
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
                this.#onInitialMessage(msg, ws, node)
              } else {
                this.#onMessage(msg, node)
              }
            }
            catch (error) {
              console.error(error);
            }
          });
      })
    }  
}