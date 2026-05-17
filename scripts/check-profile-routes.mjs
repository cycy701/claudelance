import { existsSync, readFileSync } from "node:fs";

const files = [
  "apps/web/components/profile-page.tsx",
  "apps/web/app/worker/[address]/page.tsx",
  "apps/web/app/poster/[address]/page.tsx",
  "apps/web/app/bounty/[id]/page.tsx",
];

const missing = files.filter((file) => !existsSync(file));
if (missing.length > 0) {
  console.error(`Missing expected profile file(s): ${missing.join(", ")}`);
  process.exit(1);
}

const profile = readFileSync(files[0], "utf8");
const worker = readFileSync(files[1], "utf8");
const poster = readFileSync(files[2], "utf8");
const detail = readFileSync(files[3], "utf8");

const expectations = [
  [worker, 'kind="worker"', "worker route renders the worker profile"],
  [poster, 'kind="poster"', "poster route renders the poster profile"],
  [profile, "/api/bounties", "profile data comes from the bounties API"],
  [profile, "Celoscan", "profile exposes a Celoscan link"],
  [profile, "Token totals", "profile shows token totals"],
  [profile, "Direct hire", "worker profile identifies direct-hire matches"],
  [detail, "/worker/", "bounty detail links to worker profiles"],
  [detail, "/poster/", "bounty detail links to poster profiles"],
];

const failures = expectations
  .filter(([source, token]) => !source.includes(token))
  .map(([, , message]) => message);

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Profile routes contract is present.");
