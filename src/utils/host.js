import { networkInterfaces } from "os";

export function getLocalIps() {
  if (process.env.HOST_LAN_IP) {
    return [process.env.HOST_LAN_IP];
  }
  const interfaces = networkInterfaces();
  const ips = new Set();
  for (const iface of Object.values(interfaces)) {
    for (const config of iface) {
      if (config.family === "IPv4") {
        ips.add(config.address);
      }
    }
  }
  return Array.from(ips);
}
