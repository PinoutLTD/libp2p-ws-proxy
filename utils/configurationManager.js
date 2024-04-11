import fs from 'fs/promises';
import PeerId from 'peer-id';
import { createFromJSON } from '@libp2p/peer-id-factory';

/**
 * Libp2p node configuration manager. It checks if the JSON peer id exists,
 * generates a new one if not and returns it.
 */
export class ConfigurationManager {
  constructor(logger) {
    this.filePath = 'peerIdJson.json';
    this.logger = logger;
  }

  /**
   * Generates peer id JSON file.
   */
  async #generateJSONPeerId() {
    this.logger.INFO('Generating json config...');
    try {
      const peerId = await PeerId.create();
      const jsonContent = peerId.toJSON();
      await fs.writeFile(this.filePath, JSON.stringify(jsonContent, null, 2));
      this.logger.INFO(`Generated Private Key and stored in: ${this.filePath}`);
    } catch (error) {
      this.logger.ERROR(error, '#generateJSONPeerId');
    }
  }

  /**
   * Generates peer id json file if it not exists and returns it.
   */
  async loadOrGeneratePeerId() {
    try {
      await fs.access(this.filePath);
    } catch (error) {
      this.logger.INFO(error.code);
      if (error.code === 'ENOENT') {
        this.logger.INFO('No peerIdJson.json file. Creating a new one...');
        await this.#generateJSONPeerId();
      }
    }
    const fileContent = await fs.readFile(this.filePath, 'utf-8');
    const jsonContent = JSON.parse(fileContent);
    const peerId = await createFromJSON(jsonContent);
    return peerId;
  }
}
