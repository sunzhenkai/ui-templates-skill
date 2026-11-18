import type { z } from "zod"

/** Fetch JSON and parse it with a Zod schema; server data never reaches components unvalidated. */
export async function fetchJson<T extends z.ZodType>(url: string, schema: T, init?: RequestInit): Promise<z.infer<T>> {
  const response = await fetch(url, { ...init, headers: { Accept: "application/json", ...init?.headers } })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
  return schema.parse(await response.json())
}
