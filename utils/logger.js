
export class Logger {

    #getTimeDate() {
        const date = new Date()
        const currentDate = date.toLocaleDateString()
        const currentTime = date.toLocaleTimeString('en-US', {
            hour12: false,
            hour: "numeric",
            minute: "numeric",
            second: "numeric"
        })
        return { currentDate, currentTime }
    }

    INFO(msg, functionName = undefined) {
        const { currentDate, currentTime } = this.#getTimeDate()
        console.log(`${currentDate} ${currentTime} - INFO ${functionName ? functionName : ""}`, msg)
    }

    ERROR(msg, functionName = undefined) {
        const { currentDate, currentTime } = this.#getTimeDate
        console.log(`${currentDate} ${currentTime} - ERROR ${functionName ? functionName : ""}`, msg)
    }
}