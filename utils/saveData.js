import fs from 'fs/promises';

export async function createDir4SavedData() {
    const directoryPath = process.env.SAVED_DATA_DIR_PATH
    try {
      await fs.access(directoryPath);
      console.log(`Directory '${directoryPath}' already exists.`);
    } catch (error) {
      await fs.mkdir(directoryPath);
      console.log(`Directory '${directoryPath}' created.`);
    }
  
  }