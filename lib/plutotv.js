const fs = require("fs");
const path = require("path");

// Node 18+ has global fetch; on older versions you'd need node-fetch
const PLUTO_CHANNELS_URL = "https://service-channels.clusters.pluto.tv/v1/guide/channels";

async function fetchChannels(region) {
  const url = new URL(PLUTO_CHANNELS_URL);
  if (region) url.searchParams.set("region", region);

  const res = await fetch(url.toString(), {
    headers: {
      "Accept": "application/json",
      "User-Agent": "PlutoTV-Playlist-Scraper"
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch channels: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  // Pluto returns an array of channels
  return Array.isArray(data) ? data : data?.data || [];
}

function buildM3U(channels) {
  let lines = ["#EXTM3U"];

  for (const ch of channels) {
    const name = ch.name || ch.slug || "Unknown";
    const id = ch._id || ch.id || "";
    const logo = ch.logo || ch.solidLogoPNG || ch.colorLogoPNG || "";
    const group = ch.category || ch.genre || "Pluto TV";

    // Find an HLS stream URL
    const url =
      ch.stitched && ch.stitched.urls && ch.stitched.urls[0] && ch.stitched.urls[0].url
        ? ch.stitched.urls[0].url
        : ch.url || ch.streamUrl || "";

    if (!url) continue;

    lines.push(
      `#EXTINF:-1 tvg-id="${id}" tvg-logo="${logo}" group-title="${group}",${name}`
    );
    lines.push(url);
  }

  return lines.join("\n") + "\n";
}

function buildEPG(channels) {
  // This is a minimal placeholder EPG: channel list only, no programmes.
  // It’s enough for many players to recognise channels.
  const now = new Date().toISOString();
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<tv date="${now}">\n`;

  for (const ch of channels) {
    const id = ch._id || ch.id || "";
    const name = ch.name || ch.slug || "Unknown";
    const logo = ch.logo || ch.solidLogoPNG || ch.colorLogoPNG || "";

    xml += `  <channel id="${id}">\n`;
    xml += `    <display-name>${escapeXml(name)}</display-name>\n`;
    if (logo) {
      xml += `    <icon src="${escapeXml(logo)}" />\n`;
    }
    xml += `  </channel>\n`;
  }

  xml += `</tv>\n`;
  return xml;
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function process(config) {
  console.log("PlutoTV: starting scrape…");

  const region = config.get && config.get("region");
  const outputDir =
    (config.get && config.get("outputDir")) ||
    path.join(__dirname, "..", "output");

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log("Created output directory:", outputDir);
  }

  const channels = await fetchChannels(region);
  console.log(`PlutoTV: fetched ${channels.length} channels`);

  if (!channels.length) {
    console.warn("PlutoTV: no channels returned, nothing to write.");
    return;
  }

  // Write M3U
  const m3u = buildM3U(channels);
  const m3uPath = path.join(outputDir, "pluto.m3u");
  fs.writeFileSync(m3uPath, m3u);
  console.log("PlutoTV: wrote playlist:", m3uPath);

  // Write EPG
  const epgXml = buildEPG(channels);
  const epgPath = path.join(outputDir, "pluto.xml");
  fs.writeFileSync(epgPath, epgXml);
  console.log("PlutoTV: wrote EPG:", epgPath);

  // Optional JSON dump
  if (config.get && config.get("exportJson")) {
    const jsonPath = path.join(outputDir, "channels.json");
    fs.writeFileSync(jsonPath, JSON.stringify(channels, null, 2));
    console.log("PlutoTV: wrote JSON:", jsonPath);
  }

  console.log("PlutoTV: scrape complete.");
}

module.exports = { process };
