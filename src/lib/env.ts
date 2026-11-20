import { z } from 'zod'

const schema = z.object({
  VITE_API_BASE_URL: z.url(),
  VITE_WS_BASE_URL: z.url(),
})

// Fails fast at startup when .env is missing or wrong.
export const env = schema.parse(import.meta.env)
