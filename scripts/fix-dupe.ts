import { readFileSync, writeFileSync } from "node:fs";
const src = readFileSync("src/data/distros.ts", "utf8");
const cleaned = src
  .split("\n")
  .filter((l) => !/^\s{4}(governance|aiPolicy): "/.test(l))
  .join("\n");
writeFileSync("src/data/distros.ts", cleaned);
console.log("stripped all governance/aiPolicy lines");
