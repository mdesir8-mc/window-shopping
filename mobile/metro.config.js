// Metro config: watch the repo's shared/ directory so shared domain types resolve
// without publishing a package. Single source of truth = ../shared (see
// docs/mobile-build.md § Repository layout).
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

// Let Metro bundle files from ../shared even though they live outside mobile/.
config.watchFolders = [path.resolve(repoRoot, "shared")];

// Resolve node modules from the app first, then fall back to the repo root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(repoRoot, "node_modules")
];

module.exports = config;
