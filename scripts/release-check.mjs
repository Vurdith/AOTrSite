import { spawn } from "node:child_process";

const commands = [
  ["npm", ["run", "lint"]],
  ["npx", ["tsc", "--noEmit"]],
  ["npm", ["run", "build"]],
  ["npm", ["audit", "--audit-level=moderate"]],
];

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { shell: true, stdio: "inherit" });
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

let failed = false;

for (const [command, args] of commands) {
  const code = await run(command, args);

  if (code !== 0) {
    failed = true;
    if (command === "npm" && args[0] === "audit") {
      console.warn("npm audit reported issues. Review whether they are actionable before release.");
      continue;
    }

    process.exit(code);
  }
}

if (failed) {
  console.warn("Release check completed with audit warnings.");
} else {
  console.log("Release check passed.");
}
