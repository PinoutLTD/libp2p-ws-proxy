import { getRequest, sendResponse, handle, createNode } from "./libp2pHandler.js"
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
  await node.start()
  const conn = await node.dial(multiaddr(relayAddr))
  console.log(`Connected to the relay ${conn.remotePeer.toString()}`)
  let connectedPeerId = null;

  console.log('Listener:')
  node.getMultiaddrs().forEach((ma) => {
    console.log(ma.toString())
  })

  node.addEventListener('peer:connect', (evt) => {
    connectedPeerId = evt.detail.toString()
    console.log('received dial to me from:', connectedPeerId)
  })

  node.addEventListener("self:peer:update", (evt) => {
    console.log(`Advertising with a relay address of ${node.getMultiaddrs()}`);
  });

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

  wss.on('connection', function connection(ws) {
    ws.on('error', console.error);
  
    ws.on('message', async function message(data) {
      console.log(connectedPeerId)
      console.log('received: %s', data)
      try {
        if (!!connectedPeerId) {
          const msg = JSON.parse(data)
          const libp2pStream = await node.dialProtocol(connectedPeerId, '/call', null);
          console.log(libp2pStream)
          await sendResponse(libp2pStream, msg);
        }
      }
      catch (error) {
        console.error(error);
      }
    
    });
  });

  
}


run()

