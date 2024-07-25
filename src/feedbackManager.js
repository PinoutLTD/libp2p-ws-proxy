const protocol = "/feedback"

export class FeedbackManager {
  constructor(logger, wsManager, messageHandler) {
    this.logger = logger;
    this.wsManager = wsManager;
    this.messageHandler = messageHandler;
  }

  sendFeedbackMessage(response, ws) {
    this.logger.INFO(response, "feedback handler")
    const msg = this.#formatMessage(response, protocol)
    for (const client of this.wsManager.wsServer.clients) {
      if (ws == client) {
        client.send(JSON.stringify(msg))
      }
    }
    return
  }

  #formatMessage(response, protocol) {
    return { "data": { "feedback": response } , "protocol": protocol}
  }

}