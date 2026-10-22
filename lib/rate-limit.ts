const EMAIL_COOLDOWN_MS = 60_000;
const IP_WINDOW_MS = 15 * 60_000;
const IP_MAX = 5;

const recentByEmail = new Map<string, number>();
const recentByIp = new Map<string, number[]>();
const recentSubmissions = new Map<string, number>();

function prune(now: number) {
  for (const [key, ts] of recentByEmail) {
    if (now - ts > EMAIL_COOLDOWN_MS) recentByEmail.delete(key);
  }
  for (const [ip, stamps] of recentByIp) {
    const fresh = stamps.filter((t) => now - t < IP_WINDOW_MS);
    if (fresh.length === 0) recentByIp.delete(ip);
    else recentByIp.set(ip, fresh);
  }
  for (const [key, ts] of recentSubmissions) {
    if (now - ts > EMAIL_COOLDOWN_MS) recentSubmissions.delete(key);
  }
}

export function isRateLimited(email: string, ip: string, now = Date.now()): boolean {
  prune(now);
  if ((recentByEmail.get(email) ?? 0) > now - EMAIL_COOLDOWN_MS) return true;
  const stamps = recentByIp.get(ip) ?? [];
  return stamps.length >= IP_MAX;
}

export function markSubmitted(email: string, ip: string, now = Date.now()) {
  recentByEmail.set(email, now);
  const stamps = recentByIp.get(ip) ?? [];
  stamps.push(now);
  recentByIp.set(ip, stamps);
}

export function isDuplicateSubmission(id: string, now = Date.now()): boolean {
  prune(now);
  return (recentSubmissions.get(id) ?? 0) > now - EMAIL_COOLDOWN_MS;
}

export function markSubmission(id: string, now = Date.now()) {
  recentSubmissions.set(id, now);
}
