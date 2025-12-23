import { FeedbackManager } from "./feedbackManager.js";
import { Libp2pManager } from "./libp2pManager.js";
import { MessageHandler } from "./messageHandler.js";
import { logger } from "./utils/logger.js";
import { createDir4SavedData } from "./utils/saveData.js";
import { WebSocketManager } from "./wsManager.js";

async function run() {
  await createDir4SavedData();
  const libp2pManager = new Libp2pManager();
  const node = await libp2pManager.createNode();
  const messageHandler = new MessageHandler(libp2pManager);
  const wsManager = new WebSocketManager(messageHandler, node);
  libp2pManager.setFeedbackManager(new FeedbackManager(wsManager));
  wsManager.onConnectionManager();

  node.addEventListener("peer:connect", async evt => {
    const connectedPeerId = evt.detail.toString();
    logger.INFO(`received dial to me from: ${connectedPeerId}`);
    await messageHandler.sendSavedMsg(connectedPeerId);
    setTimeout(() => {
      wsManager.updateMultiAddresses();
    }, 1000);
  });

  node.addEventListener("peer:disconnect", async evt => {
    const connectedPeerId = evt.detail.toString();
    logger.INFO(`peer:disconnect to me from: ${connectedPeerId}`);
    setTimeout(() => {
      wsManager.updateMultiAddresses();
    }, 1000);
  });

  node.addEventListener("connection:open", () => {
    logger.INFO("connection opened");
  });

  node.addEventListener("connection:close", async evt => {
    const connectedPeerId = evt.detail.remotePeer.toString();
    logger.INFO(`Connection closed ${connectedPeerId}`);
    const relayAddr = libp2pManager.findRelayAddress(connectedPeerId);
    logger.INFO(`isRelayConnected: ${!!relayAddr}`);
    if (relayAddr) {
      libp2pManager.reconnectRelay(relayAddr);
    }
  });

  await node.start();

  logger.INFO(`Node started with id ${node.peerId.toString()}`);

  await libp2pManager.connectRelays();
}

run();
