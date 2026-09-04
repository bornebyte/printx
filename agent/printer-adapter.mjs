import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function printWithSystemSpooler(job, printerName) {
  if (!job.documentPath) throw new Error("This job has no local document payload yet. Use mock mode until secure document delivery is enabled.");

  if (process.platform === "win32") {
    await execFileAsync("powershell.exe", ["-NoProfile", "-Command", "$path = $args[0]; Start-Process -FilePath $path -Verb Print -Wait", "--", job.documentPath]);
    return;
  }

  const args = ["-n", String(job.copies)];
  if (printerName) args.push("-d", printerName);
  args.push(job.documentPath);
  await execFileAsync("lp", args);
}

export async function printDocument(job, { mode = "mock", printerName = "" } = {}) {
  if (mode === "system") {
    await printWithSystemSpooler(job, printerName);
    return { adapter: "system", printedAt: new Date().toISOString() };
  }

  // Mock mode exercises the complete secure queue and status lifecycle without
  // sending anything to a physical printer. It is the safe default for setup.
  await wait(Math.min(2_000, Math.max(250, job.copies * 150)));
  return { adapter: "mock", printedAt: new Date().toISOString() };
}
