import type { DurableJobState } from "../domain/types.js";

export interface JobStateStore {
  get(idempotencyKey: string): Promise<DurableJobState | undefined>;
  save(state: DurableJobState): Promise<void>;
}
