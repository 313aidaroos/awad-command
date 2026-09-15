import type { WorkerTool } from '../index.js';
import { computerNavigateTool } from './navigate.js';
import type { ComputerRuntime } from './runtime.js';
import { computerScreenshotTool } from './screenshot.js';

export { createFakeRuntime, createPlaywrightRuntime, createUnavailableRuntime, profilePath } from './runtime.js';
export type { ComputerRuntime } from './runtime.js';
export {
  HaltError,
  PHASE1_RECORD_ONLY,
  PERSONAL_LOGIN_HINT,
  Phase1RecordOnlyError,
  SensitiveActionPause,
  describeSensitiveHit,
} from './safety.js';

export function computerTools(runtime: ComputerRuntime): WorkerTool[] {
  return [computerScreenshotTool(runtime), computerNavigateTool(runtime)];
}
