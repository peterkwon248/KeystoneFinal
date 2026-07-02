// tests/helpers.ts — golden loading + JSON round-trip normalization.
// Both sides of every comparison go through JSON so `undefined` fields drop
// exactly like they did when the goldens were serialized.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const goldens: any = JSON.parse(
  fs.readFileSync(path.join(__dirname, "goldens.json"), "utf8"),
);

/** JSON round-trip — normalize undefined/NaN the same way the golden dump did */
export const J = (x: unknown): any => (x === undefined ? undefined : JSON.parse(JSON.stringify(x ?? null)));
