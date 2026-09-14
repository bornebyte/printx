import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { DurableJobState } from "../domain/types.js";
import type { JobStateStore } from "../ports/job-state-store.js";

export class FileJobStateStore implements JobStateStore {
  private readonly filePath: string;
  private states?: Record<string, DurableJobState>;

  constructor(runtimeDir: string) {
    this.filePath = join(runtimeDir, "job-state.json");
  }

  async get(idempotencyKey: string): Promise<DurableJobState | undefined> {
    await this.load();
    return this.states?.[idempotencyKey];
  }

  async save(state: DurableJobState): Promise<void> {
    await this.load();
    this.states![state.idempotencyKey] = state;
    await mkdir(join(this.filePath, ".."), { recursive: true });
    const temporaryPath = `${this.filePath}.tmp`;
    await writeFile(temporaryPath, JSON.stringify(this.states, null, 2));
    await rename(temporaryPath, this.filePath);
  }

  private async load(): Promise<void> {
    if (this.states) return;
    try {
      this.states = JSON.parse(await readFile(this.filePath, "utf8")) as Record<string, DurableJobState>;
    } catch {
      this.states = {};
    }
  }
}
