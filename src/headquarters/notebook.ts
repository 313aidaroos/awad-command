import { z } from "zod";
export const notebookSchema = z
  .array(
    z.object({
      id: z.string().max(100),
      kind: z.enum(["task", "schedule", "content"]),
      title: z.string().min(1).max(180),
      when: z.string().max(40),
      done: z.boolean(),
    }),
  )
  .max(200);
export const notebookKey = "awad.headquarters.notebook.v1";
export function readNotebook(raw: string | null) {
  try {
    return notebookSchema.parse(JSON.parse(raw ?? "[]"));
  } catch {
    return [];
  }
}
