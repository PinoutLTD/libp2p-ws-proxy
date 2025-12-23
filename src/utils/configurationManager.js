import { generateKeyPair, privateKeyFromRaw } from "@libp2p/crypto/keys";
import fs from "fs";
import { fromString as uint8ArrayFromString } from "uint8arrays/from-string";
import { toString as uint8ArrayToString } from "uint8arrays/to-string";
import { logger } from "./logger.js";

/**
 * Libp2p node configuration manager. It checks if the JSON peer id exists,
 * generates a new one if not and returns it.
 */
export class ConfigurationManager {
  constructor() {
    this.filePath = "config/config.json";
  }

  /**
   * Generates peer id json file if it not exists and returns it.
   */
  load() {
    if (!fs.existsSync(this.filePath)) {
      logger.INFO("No config.json file. Creating a new one...");
      this.#init();
    }
    const fileContent = fs.readFileSync(this.filePath, "utf-8");
    return JSON.parse(fileContent);
  }

  #init() {
    logger.INFO("Generating json config...");
    try {
      let jsonContent;
      if (fs.existsSync("config/config.template.json")) {
        const fileContent = fs.readFileSync(
          "config/config.template.json",
          "utf-8"
        );
        jsonContent = JSON.parse(fileContent);
      } else {
        jsonContent = {
          noAnnounce: [
            "/ip4/127.0.0.1/tcp/9988",
            "/ip4/127.0.0.1/tcp/9999/ws",
            "/ip4/127.0.0.1/udp/9977/webrtc-direct"
          ],
          relays: [
            "/dns4/libp2p-relay-2.robonomics.network/tcp/3011/p2p/12D3KooWQwEUdh5WfAUtViDpgRE2uF7AhDpc9DcsVLkHjq52xwps"
          ]
        };
      }
      fs.writeFileSync(this.filePath, JSON.stringify(jsonContent));
      logger.INFO(`Generated config and stored in: ${this.filePath}`);
    } catch (error) {
      logger.ERROR(error, "#init");
    }
  }

  /**
   * Generates peer id json file if it not exists and returns it.
   */
  async loadOrGeneratePeerId() {
    let config = this.load();
    if (!config.privKey) {
      await this.#generateJSONPeerId();
      config = this.load();
    }
    const peerId = this.#restorePeerIdFromPrivKey(config.privKey);
    return peerId;
  }

  /**
   * Generates peer id JSON file.
   */
  async #generateJSONPeerId() {
    logger.INFO("Generating json config...");
    try {
      const privateKey = await generateKeyPair("Ed25519");
      const privKey = uint8ArrayToString(privateKey.raw, "base64pad");
      const config = await this.load();
      const jsonContent = { ...config, privKey };
      fs.writeFileSync(this.filePath, JSON.stringify(jsonContent, null, 2));
      logger.INFO(`Generated Private Key and stored in: ${this.filePath}`);
    } catch (error) {
      logger.ERROR(error, "#generateJSONPeerId");
    }
  }

  // eslint-disable-next-line class-methods-use-this
  #restorePeerIdFromPrivKey(privKey) {
    const peerId1 = privateKeyFromRaw(uint8ArrayFromString(privKey, "base64"));
    return peerId1;
  }
}
