import fs from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config();


const directoryPath = process.env.SAVED_DATA_DIR_PATH

export async function createDir4SavedData() {
    try {
      await fs.access(directoryPath);
      console.log(`Directory '${directoryPath}' already exists.`);
    } catch (error) {
      await fs.mkdir(directoryPath);
      console.log(`Directory '${directoryPath}' created.`);
    }
  
  }

export function saveMsg2File(msg) {
  const filePath = `../${directoryPath}/${msg.protocol}.json`
  fs.writeFile(filePath, msg)
  .then(() => console.log('Data written to file successfully.'))
  .catch((err) => console.error('Error writing to file:', err));
}