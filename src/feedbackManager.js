import { logger } from "./utils/logger.js";

const protocol = "/feedback";

export class FeedbackManager {
  constructor(wsManager) {
    this.wsManager = wsManager;
  }

  sendFeedbackMessage(response, ws) {
    logger.INFO(response, "sendFeedbackMessage");
    const msg = this.#formatMessage(response, protocol);
    for (const client of this.wsManager.wsServer.clients) {
      if (ws === client) {
        client.send(JSON.stringify(msg));
      }
    }
  }

  #formatMessage(response) {
    return { data: { feedback: response }, protocol };
  }
}
