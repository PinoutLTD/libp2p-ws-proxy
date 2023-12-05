import { Libp2pManager } from "./libp2pManager.js";
import { WebSocketManager } from "./wsManager.js"
import { MessageHandler } from "./messageHandler.js"
import { multiaddr } from '@multiformats/multiaddr'
import { createDir4SavedData } from "../utils/saveData.js"
import { Logger  } from "../utils/logger.js";

import dotenv from 'dotenv';

dotenv.config();

async function run() {
  const logger = new Logger()
  await createDir4SavedData(logger)
  const libp2pManager = new Libp2pManager(logger)
  
  const node = await libp2pManager.createNode()
  const messageHandler = new MessageHandler(libp2pManager, logger)
  const wsManager = new WebSocketManager(messageHandler, logger)
  wsManager.onConnectionManager(node)


  logger.INFO(`Node started with id ${node.peerId.toString()}`);
  const conn = await node.dial(multiaddr(libp2pManager.realayAddress))
  
  logger.INFO(`Connected to the relay ${conn.remotePeer.toString()}`)

  node.addEventListener("self:peer:update", (evt) => {
    logger.INFO(`Advertising with a relay address of ${node.getMultiaddrs()}`);
  });

  node.addEventListener('peer:connect', async (evt) => {
    const connectedPeerId = evt.detail.toString()
    logger.INFO('received dial to me from:', connectedPeerId)
    await messageHandler.sendSavedMsg(connectedPeerId, node)
  })

  node.addEventListener("connection:open", event => {
    logger.INFO("connection opened")
  });
  node.addEventListener("connection:close", () => {
    logger.INFO("connection closed")
  });

}


run()
