import WebSocket from 'ws'

/**
 * Handler for messsages from libp2p and websocket channels. It proxes msgs from
 * libp2p to websocket clients and msgs from websocket clients to libp2p nodes.
 * @param  libp2pManager Instance of Libp2pManager ckass.
 */
export class MessageHandler {
    constructor(libp2pManager) {
        this.libp2pManager = libp2pManager
    }

    /**
     * Proxying messages from Libp2p clients to websocket clients. The message is sent only 
     * to ws clients that are listening the protocol.
     * @param  msg The message to proxy.
     * @param  protocol Libp2p protocol from which the message originated.
     * @param wsServer Instance of the websocket server.
     * @param wsClients Map of all the ws clients.
     */
    #proxyLibp2pMsg2WS(msg, protocol, wsServer, wsClients) {
        wsServer.clients.forEach((client) => {
          const clientProtocols = wsClients.get(client).protocolsToListen
          if (clientProtocols.includes(protocol)) {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(msg));
              console.log("Sent msg to ws")
            }
          }
        })
    }

    /**
     * Handler for the initial message from a WebSocket client. It stores from which libp2p protocol this
     * client wants to get messages and opens a corresponding libp2p handler for each of one. 
     * @param  msg The message from ws client.
     * @param wsServer Instance of the websocket server.
     * @param wsClients Map of all the ws clients.
     * @param node Instance of libp2p node
     */
    onWSInitialMessage(msg, wsServer, wsClients, node) {
        const protocols = msg.protocols_to_listen
        protocols.forEach((protocol) => {
          this.libp2pManager.handle(node, protocol, async (msg, stream) => {
            await this.libp2pManager.sendResponse(stream, { result: true })
            this.#proxyLibp2pMsg2WS(msg, protocol, wsServer, wsClients)
          })
        })   
    }

    /**
     * Handler for a message from a WebSocket client, pproxied to the specific 
     * Libp2p server; otherwise, it is broadcasted to all Libp2p clients.  
     * @param  msg The message from the ws client.
     * @param node Instance of libp2p node
     */
    onWSMessage(msg, node) {
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

}