import { getRequest, sendResponse, handle, createNode } from "./libp2pHandler.js"
import { createWebsocketServer } from "./wsHandler.js"
import WebSocket from 'ws';


async function run () {
  const wss = createWebsocketServer()
  const node = await createNode()
  await node.start()

  console.log('Listener:')
  node.getMultiaddrs().forEach((ma) => {
    console.log(ma.toString())
  })

  node.addEventListener('peer:connect', (evt) => {
    console.log('received dial to me from:', evt.detail.toString())
  })

  handle(node, '/call', async (msg, stream) => {
    console.log('command', msg)
    await sendResponse(stream, { result: true })
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(msg));
      }
    });
  })

  wss.on('connection', (ws) => {
    console.log('Client connected via websocket');
  
    wss.on('message', (message) => {
      console.log(`Received: ${message}`);
    });
    
    wss.on('close', () => {
        console.log('Client disconnected');
    });
  });
  
}


run()

