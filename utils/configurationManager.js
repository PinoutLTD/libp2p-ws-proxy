import fs from 'fs/promises';
import { unmarshalPrivateKey } from '@libp2p/crypto/keys';
import {
  createEd25519PeerId,
  createFromPrivKey,
} from '@libp2p/peer-id-factory';
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string';
import { toString as uint8ArrayToString } from 'uint8arrays/to-string';

/**
 * Libp2p node configuration manager. It checks if the JSON peer id exists,
 * generates a new one if not and returns it.
 */
export class ConfigurationManager {
  constructor(logger) {
    this.filePath = process.env.PEER_ID_CONFIG_PATH;
    this.logger = logger;
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
    const { privKey } = JSON.parse(fileContent);
    const peerId = await this.#restorePeerIdFromPrivKey(privKey);
    return peerId;
  }

  /**
 * Generates peer id JSON file.
 */
  async #generateJSONPeerId() {
    this.logger.INFO('Generating json config...');
    try {
      const peerId = await createEd25519PeerId();
      const privKey = uint8ArrayToString(peerId.privateKey, 'base64pad');
      const jsonContent = { privKey };
      await fs.writeFile(this.filePath, JSON.stringify(jsonContent, null, 2));
      this.logger.INFO(`Generated Private Key and stored in: ${this.filePath}`);
    } catch (error) {
      this.logger.ERROR(error, '#generateJSONPeerId');
    }
  }

  // eslint-disable-next-line class-methods-use-this
  async #restorePeerIdFromPrivKey(privKey) {
    const privateKey = uint8ArrayFromString(privKey, 'base64');
    const key = await unmarshalPrivateKey(privateKey);
    const peerId = await createFromPrivKey(key);
    return peerId;
  }
}
