import fs from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config();


const directoryPath = process.env.SAVED_DATA_DIR_PATH

/**
 * Creates directory for saving data if it doesn't exists.
 * @param logger Instance of the Logger class.
 */
export async function createDir4SavedData(logger) {
    try {
      await fs.access(directoryPath);
      logger.INFO(`Directory '${directoryPath}' already exists.`);
    } catch (error) {
      await fs.mkdir(directoryPath);
      logger.INFO(`Directory '${directoryPath}' created.`);
    }
  
  }

/**
 * Save message to the file.
 * @param msg The message to save
 * @param logger Instance of the Logger class.
 */
export function saveMsg2File(msg, logger) {
  const filePath = `${directoryPath}${msg.protocol}.json`
  fs.writeFile(filePath, JSON.stringify(msg))
  .then()
  .catch((error) => logger.ERROR(error, "saveMsg2File"));
}