import fs from "fs/promises";
import { logger } from "./logger.js";

const directoryPath = "saved_data";

/**
 * Creates directory for saving data if it doesn't exists.
 */
export async function createDir4SavedData() {
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
 */
export function saveMsg2File(msg) {
  const filePath = `${directoryPath}${msg.protocol}.json`;
  fs.unlink(filePath)
    .then(() => logger.INFO("file deleted"))
    .catch(error => logger.ERROR(error, "saveMsg2File, deleting file"));
  fs.writeFile(filePath, JSON.stringify(msg))
    .then()
    .catch(error => logger.ERROR(error, "saveMsg2File"));
}
