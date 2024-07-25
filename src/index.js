/* eslint-disable no-await-in-loop */
import { multiaddr } from '@multiformats/multiaddr';
import { Libp2pManager } from './libp2pManager.js';
import { WebSocketManager } from './wsManager.js';
import { MessageHandler } from './messageHandler.js';
import { createDir4SavedData } from '../utils/saveData.js';
import { Logger } from '../utils/logger.js';
import { FeedbackManager } from './feedbackManager.js';

async function run() {
  const logger = new Logger();
  await createDir4SavedData(logger);
  const libp2pManager = new Libp2pManager(logger);

  const node = await libp2pManager.createNode();
  const messageHandler = new MessageHandler(libp2pManager, logger);
  const wsManager = new WebSocketManager(messageHandler, logger, node);
  const relayAddr = multiaddr(libp2pManager.realayAddress)
  const feedbackManager = new FeedbackManager(logger, wsManager, messageHandler)
  libp2pManager.setFeedbackManager(feedbackManager)
  wsManager.onConnectionManager();

  logger.INFO(`Node started with id ${node.peerId.toString()}`);
  const conn = await node.dial(relayAddr);

  logger.INFO(`Connected to the relay ${conn.remotePeer.toString()}`);

  node.addEventListener('self:peer:update', () => {
    logger.INFO(`Advertising with a relay address of ${node.getMultiaddrs()}`);
  });

  node.addEventListener('peer:connect', async (evt) => {
    const connectedPeerId = evt.detail.toString();
    logger.INFO('received dial to me from:', connectedPeerId);
    await messageHandler.sendSavedMsg(connectedPeerId, node);
  });

  node.addEventListener('connection:open', () => {
    logger.INFO('connection opened');
  });

  node.addEventListener('connection:close', async () => {
    logger.INFO('Connection closed');
    const isRelayConnected = node.getMultiaddrs().some((addr) => addr.toString()
      .includes(relayAddr.toString()));
    console.log(`isRelayConnected: ${isRelayConnected}`);
    if (isRelayConnected) {
      return;
    }
    let attempt = 0;
    const maxAttempts = 5;
    const retryInterval = 5000; // 5 seconds
    const extendedInterval = 30 * 60 * 1000; // 30 minutes

    const reconnect = async () => {
      while (attempt < maxAttempts) {
        try {
          attempt++;
          await node.dial(relayAddr);
          logger.INFO('Reconnected successfully');
          return;
        } catch (error) {
          logger.INFO(`Reconnection attempt ${attempt} failed. Retrying in ${retryInterval / 1000} seconds...`);
          await new Promise((resolve) => { setTimeout(resolve, retryInterval); });
        }
      }
      logger.INFO(`All ${maxAttempts} reconnection attempts failed. Waiting for ${extendedInterval / 60000} minutes before retrying...`);
      setTimeout(reconnect, extendedInterval);
    };

    reconnect();
  });
}

run();
