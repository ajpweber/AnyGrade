const counts = new Map<string, { count: number; resetAt: number }>()

/**
 * Simple in-memory rate limiter. Per-instance (not global across serverless
 * cold starts), which is acceptable for low-traffic solo use.
 *
 * @param key    — usually the user's ID
 * @param limit  — max requests per window
 * @param windowMs — window size in milliseconds
 * @returns true if the request is allowed, false if rate limited
 */
export function checkRateLimit(
  key: string,
  limit = 30,
  windowMs = 60_000,
): boolean {
  const now = Date.now()
  const entry = counts.get(key)

  if (!entry || now > entry.resetAt) {
    counts.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= limit) return false

  entry.count++
  return true
}
