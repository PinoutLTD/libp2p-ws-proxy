const protocol = '/feedback';

export class FeedbackManager {
  constructor(logger, wsManager, messageHandler) {
    this.logger = logger;
    this.wsManager = wsManager;
    this.messageHandler = messageHandler;
  }

  sendFeedbackMessage(response, ws) {
    this.logger.INFO(response, 'feedback handler');
    const msg = this.#formatMessage(response, protocol);
    // eslint-disable-next-line no-restricted-syntax
    for (const client of this.wsManager.wsServer.clients) {
      if (ws === client) {
        client.send(JSON.stringify(msg));
      }
    }
  }

  // eslint-disable-next-line class-methods-use-this
  #formatMessage(response) {
    return { data: { feedback: response }, protocol };
  }
}
