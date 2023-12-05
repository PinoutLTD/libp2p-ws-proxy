import { Libp2pManager } from "./libp2pHandler.js";
import { WebSocketManager } from "./wsHandler.js"
import { MessageHandler } from "./messageHandler.js"
import { multiaddr } from '@multiformats/multiaddr'
import { createDir4SavedData } from "../utils/saveData.js"

import dotenv from 'dotenv';

dotenv.config();

async function run() {
  await createDir4SavedData()
  const libp2pManager = new Libp2pManager()
  
  const node = await libp2pManager.createNode()
  const messageManager = new MessageHandler(libp2pManager)
  const wsManager = new WebSocketManager(messageManager)


  console.log(`Node started with id ${node.peerId.toString()}`);
  const conn = await node.dial(multiaddr(libp2pManager.realayAddress))
  
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

}


run()
