import { z } from "zod"

import { apiGet } from "./client"

export const HealthSchema = z.object({
  status: z.string(),
})

export type Health = z.infer<typeof HealthSchema>

export async function fetchHealth(): Promise<Health> {
  const data = await apiGet<unknown>("/health")
  return HealthSchema.parse(data)
}
