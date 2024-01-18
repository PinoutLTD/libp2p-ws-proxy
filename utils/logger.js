/**
 * Logger manager.
 */
export class Logger {
  // eslint-disable-next-line class-methods-use-this
  #getTimeDate() {
    const date = new Date();
    const currentDate = date.toLocaleDateString();
    const currentTime = date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    return { currentDate, currentTime };
  }

  INFO(msg, functionName = undefined) {
    const { currentDate, currentTime } = this.#getTimeDate();
    console.log(`${currentDate} ${currentTime} - INFO ${functionName || ''}`, msg);
  }

  ERROR(msg, functionName = undefined) {
    const { currentDate, currentTime } = this.#getTimeDate();
    console.log(`${currentDate} ${currentTime} - ERROR ${functionName || ''}`, msg);
  }
}
