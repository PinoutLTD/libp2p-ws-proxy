import { WebSocketServer } from 'ws';
import { sendState } from "./libp2pHandler"

export class WebSocketManager {
    wsServer: WebSocketServer;
    constructor() {
        this.wsServer = this.createWebsocketServer()
    }

    createWebsocketServer(): WebSocketServer {
        const port = Number(process.env.PORT)
        const wss = new WebSocketServer({ port: port }, () => {
            console.log(`WebSocket server listening on port ${port}`);
        });
        return wss
    }

    onConnectionManager(node: any) {
        this.wsServer.on('connection', (ws) => {
            this.wsServer.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                const peerIdMsg = JSON.stringify({ "peerId": node.peerId.toString() })
                client.send(peerIdMsg);
                console.log("PeerId sent")
              }
            });
            ws.on('error', console.error);
        
            ws.on('message', async function message(data) {
              try {
                const msg = JSON.parse(data as unknown as string)
                console.log("Sending msg from HA...")
                for (const connection of node.getConnections()) {
                  sendState(connection, msg);
                }
              }
              catch (error) {
                console.error(error);
              }
            });
        })
    
    }


    
}
