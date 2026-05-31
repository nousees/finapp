const fs = require("fs");
const os = require("os");
const path = require("path");

const preferredNames = [/wi-?fi/i, /wireless/i, /ethernet/i, /local area/i];
const ignoredNames = [/vEthernet/i, /virtual/i, /wsl/i, /docker/i, /loopback/i, /tun/i, /vpn/i];

function findHost() {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const [name, addresses] of Object.entries(interfaces)) {
    if (ignoredNames.some((pattern) => pattern.test(name))) continue;
    for (const address of addresses || []) {
      if (address.family !== "IPv4" || address.internal) continue;
      if (address.address.startsWith("169.254.")) continue;
      candidates.push({
        name,
        address: address.address,
        score: preferredNames.some((pattern) => pattern.test(name)) ? 10 : 0,
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.address;
}

const host = findHost();
if (!host) {
  console.warn("[sync-api-host] No LAN IPv4 address found; keeping existing .env.local");
  process.exit(0);
}

const envPath = path.resolve(__dirname, "..", ".env.local");
let lines = [];
if (fs.existsSync(envPath)) {
  lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/).filter(Boolean);
}

const nextLine = `EXPO_PUBLIC_API_HOST=${host}`;
let replaced = false;
lines = lines.map((line) => {
  if (line.startsWith("EXPO_PUBLIC_API_HOST=")) {
    replaced = true;
    return nextLine;
  }
  return line;
});
if (!replaced) lines.push(nextLine);

fs.writeFileSync(envPath, `${lines.join(os.EOL)}${os.EOL}`);
console.log(`[sync-api-host] EXPO_PUBLIC_API_HOST=${host}`);
