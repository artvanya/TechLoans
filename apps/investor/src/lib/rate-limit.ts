// apps/investor/src/lib/rate-limit.ts
// Redis-backed rate limiter with in-memory fallback

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

const memoryStore = new Map<string, { count: number; resetAt: number }>()

let _redisClient: any | null | 'uninit' = 'uninit'

async function getRedisClient(): Promise<any | null> {
  if (_redisClient !== 'uninit') return _redisClient
  if (!process.env.REDIS_URL) { _redisClient = null; return null }
  try {
    const { Redis } = await import('ioredis')
    _redisClient = new Redis(process.env.REDIS_URL)
    return _redisClient
  } catch { _redisClient = null; return null }
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const prefixed = `rl:${key}`
  const r = await getRedisClient()

  if (r) {
    try {
      const current = await r.incr(prefixed)
      if (current === 1) await r.expire(prefixed, windowSeconds)
      const ttl = await r.ttl(prefixed)
      return { allowed: current <= limit, remaining: Math.max(0, limit - current), resetAt: Date.now() + ttl * 1000 }
    } catch {}
  }

  const now = Date.now()
  const entry = memoryStore.get(prefixed)
  if (!entry || entry.resetAt < now) {
    const resetAt = now + windowSeconds * 1000
    memoryStore.set(prefixed, { count: 1, resetAt })
    return { allowed: true, remaining: limit - 1, resetAt }
  }
  entry.count++
  return { allowed: entry.count <= limit, remaining: Math.max(0, limit - entry.count), resetAt: entry.resetAt }
}

export async function resetRateLimit(key: string): Promise<void> {
  const prefixed = `rl:${key}`
  const r = await getRedisClient()
  if (r) { try { await r.del(prefixed); return } catch {} }
  memoryStore.delete(prefixed)
}

export async function checkLoginRateLimit(ip: string, email: string): Promise<RateLimitResult> {
  const [byIp, byEmail] = await Promise.all([
    checkRateLimit(`login:ip:${ip}`, 20, 900),
    checkRateLimit(`login:email:${email}`, 5, 900),
  ])
  if (!byEmail.allowed) return byEmail
  if (!byIp.allowed) return byIp
  return byEmail
}

// Legacy exports used by auth.ts
export async function checkRateLimitLegacy(key: string, ip: string): Promise<boolean> {
  const result = await checkRateLimit(`${key}:${ip}`, 5, 900)
  return !result.allowed
}

export async function recordFailedLogin(email: string, ip: string): Promise<void> {
  await checkRateLimit(`login:email:${email}`, 5, 900)
}

export async function clearFailedLogins(email: string, ip: string): Promise<void> {
  await resetRateLimit(`login:email:${email}`)
  await resetRateLimit(`login:ip:${ip}`)
}
