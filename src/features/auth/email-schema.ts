import { z } from 'zod'

/** Trimmed, valid email. */
export const emailSchema = z.string().trim().pipe(z.email('Enter a valid email address.'))
