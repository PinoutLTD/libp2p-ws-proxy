import { sendResponse, handle, createNode } from "./libp2pHandler"
import { WebSocketManager } from "./wsHandler"

import { WebSocket } from 'ws';
import { multiaddr } from '@multiformats/multiaddr'
import { libp2pEventsEnum } from "./interfaces/enums";

async function run() {
  const wsManager = new WebSocketManager()

  const relayAddr = process.argv[2]
  if (!relayAddr) {
    throw new Error('the relay address needs to be specified as a parameter')
  }
  const node = await createNode()
  wsManager.onConnectionManager(node)

  handle(node, '/call', async (msg: string, stream: any) => {
    console.log('command', msg)
    await sendResponse(stream, { result: true })
    wsManager.wsServer.clients.forEach((client) => {
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


}

run()

