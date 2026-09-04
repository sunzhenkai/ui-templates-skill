import { z } from "zod"

export const healthSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("workbench-shell"),
})

export type Health = z.infer<typeof healthSchema>

export async function getHealth(): Promise<Health> {
  return healthSchema.parse({ status: "ok", service: "workbench-shell" })
}
