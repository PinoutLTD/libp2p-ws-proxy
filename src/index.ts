import { sendResponse, handle, createNode, sendState } from "./libp2pHandler.js"
import { createWebsocketServer } from "./wsHandler.js"
import { WebSocket, WebSocketServer } from 'ws';
import { multiaddr } from '@multiformats/multiaddr'
import { libp2pEventsEnum } from "./interfaces/enums.js";


async function run() {
  const wss: WebSocketServer = createWebsocketServer()
  const relayAddr = process.argv[2]
  if (!relayAddr) {
    throw new Error('the relay address needs to be specified as a parameter')
  }
  const node = await createNode()

  handle(node, '/call', async (msg: string, stream: any) => {
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

  node.addEventListener(libp2pEventsEnum.SELF_PEER_UPDATE, () => {
    console.log(`Advertising with a relay address of ${node.getMultiaddrs()}`);
  });

  node.addEventListener(libp2pEventsEnum.PEER_CONNECT, (evt: any) => {
    const connectedPeerId = evt.detail.toString()
    console.log('received dial to me from:', connectedPeerId)
  })

  node.addEventListener(libp2pEventsEnum.CONNECTION_OPEN, () => {
    console.log("connection opened")
  });
  node.addEventListener(libp2pEventsEnum.CONNECTION_CLOSE, () => {
    console.log("connection closed")
  });

  wss.on('connection', function connection(ws) {
    wss.clients.forEach((client) => {
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
  });
}


run()
