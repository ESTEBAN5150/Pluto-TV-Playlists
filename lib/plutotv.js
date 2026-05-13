
const fs = require("fs");
const path = require("path");
const channels = require("./channels");
const playlist = require("./playlist");
const epg = require("./epg");
const utils = require("./utils");

async function process(config) {
  console.log("Starting PlutoTV processing…");

  // Load channel list
  const channelList = await channels.getChannels(config);
  if (!channelList || channelList.length === 0) {
    console.error("No channels returned from PlutoTV API");
    return;
  }

  console.log(`Loaded ${channelList.length} channels`);

  // Ensure output folder exists
  const outputDir = path.join(__dirname, "..", "output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate M3U playlist
  const m3u = playlist.generateM3U(channelList, config);
  const playlistPath = path.join(outputDir, "pluto.m3u");

  fs.writeFileSync(playlistPath, m3u);
  console.log("Wrote playlist:", playlistPath);

  // Generate EPG XML
  const epgData = await epg.generateEPG(channelList, config);
  const epgPath = path.join(outputDir, "pluto.xml");

  fs.writeFileSync(epgPath, epgData);
  console.log("Wrote EPG:", epgPath);

  // Optional JSON export
  if (config.get("exportJson")) {
    const jsonPath = path.join(outputDir, "channels.json");
    fs.writeFileSync(jsonPath, JSON.stringify(channelList, null, 2));
    console.log("Wrote JSON:", jsonPath);
  }

  console.log("PlutoTV processing complete.");
}

module.exports = { process };
