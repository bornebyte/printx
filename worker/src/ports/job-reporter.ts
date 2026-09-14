import type { JobUpdate } from "../domain/types.js";

export interface JobReporter {
  report(update: JobUpdate): Promise<void>;
}
