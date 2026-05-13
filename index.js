#!/usr/bin/env node
process.title = "plutotv scraper";

const fs = require("fs");
const path = require("path");
const config = require("./lib/config");
const plutotv = require("./lib/plutotv");
const server = require("./lib/server");

// Ensure Node version
const check = (minver) => {
  let semver = process.versions.node.split(".");
  if (semver[0] < minver) {
    console.error(`ERROR: nodejs is too old. Version ${minver} or greater is required.`);
    console.error(`ERROR: ${process.versions.node} installed`);
    process.exit(1);
  }
};
check(16);

(async function () {
  config.loadConfig();

  // Ensure output folder exists
  const outputDir = path.join(__dirname, "output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log("Created output directory:", outputDir);
  }

  const port = config.get("port");
  const refresh = config.get("refresh");

  if (refresh && refresh < 3600) {
    console.error("ERROR: please set refresh interval to be at least 3600 seconds");
    process.exit(1);
  }

  // Always run scraper once
  console.log("Running PlutoTV scraper...");
  await plutotv.process(config);

  // Log output folder contents for GitHub Actions
  console.log("=== OUTPUT FOLDER CONTENTS ===");
  try {
    const files = fs.readdirSync(outputDir);
    console.log(files.length ? files : "No files generated");
  } catch (err) {
    console.error("Error reading output folder:", err);
  }

  // Start server if needed
  if (port && refresh) {
    setInterval(() => plutotv.process(config), refresh * 1000);
    server.serve(config);
  } else if (port) {
    server.serve(config);
  }
})();

