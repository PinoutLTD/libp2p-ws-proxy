import { sendResponse, handle, createNode, sendState } from "./libp2pHandler.js"
import { createWebsocketServer } from "./wsHandler.js"
import WebSocket from 'ws';
import { multiaddr } from '@multiformats/multiaddr'


async function run () {
  const wss = createWebsocketServer()
  const relayAddr = process.argv[2]
  if (!relayAddr) {
    throw new Error('the relay address needs to be specified as a parameter')
  }
  const node = await createNode()

  handle(node, '/call', async (msg, stream) => {
    console.log('command', msg)
    await sendResponse(stream, { result: true })
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(msg));
        console.log("sent")
      }
    });
  })

  console.log(`Node started with id ${node.peerId.toString()}`);
  const conn = await node.dial(multiaddr(relayAddr))
  console.log(`Connected to the relay ${conn.remotePeer.toString()}`)

  node.addEventListener("self:peer:update", (evt) => {
    console.log(`Advertising with a relay address of ${node.getMultiaddrs()}`);
  });

  node.addEventListener('peer:connect', (evt) => {
    const connectedPeerId = evt.detail.toString()
    console.log('received dial to me from:', connectedPeerId)
  })

  node.addEventListener("connection:open", event => {
    console.log("connection opened")
  });
  node.addEventListener("connection:close", () => {
    console.log("connection closed")
  });

  wss.on('connection', function connection(ws) {
    ws.on('error', console.error);
  
    ws.on('message', async function message(data) {
      try {
        console.log('received: %s', data)
        const msg = JSON.parse(data)
        console.log("Sending msg from HA...")
        for (const connection of node.getConnections()) {
          sendState(connection, msg);
        } 
      }
      catch (error) {
        console.error(error);
      }
    
    });
  });
}


run()
