// P2: cache ligero de restaurant_id por usuario para evitar hits redundantes a `profiles`.
// - Sólo se invalida en sign-out o si cambia el user id.
// - No cachea PII, sólo el uuid del restaurante.
const KEY_PREFIX = "tc:rid:";
const memory = new Map<string, string>();

export function getCachedRestaurantId(userId: string): string | null {
  if (!userId) return null;
  const mem = memory.get(userId);
  if (mem) return mem;
  if (typeof sessionStorage === "undefined") return null;
  try {
    return sessionStorage.getItem(KEY_PREFIX + userId);
  } catch {
    return null;
  }
}

export function setCachedRestaurantId(userId: string, rid: string | null): void {
  if (!userId) return;
  if (rid) {
    memory.set(userId, rid);
    try {
      sessionStorage?.setItem(KEY_PREFIX + userId, rid);
    } catch {
      /* ignore quota / unavailable */
    }
  } else {
    memory.delete(userId);
    try {
      sessionStorage?.removeItem(KEY_PREFIX + userId);
    } catch {
      /* ignore */
    }
  }
}

export function clearTenantCache(): void {
  memory.clear();
  if (typeof sessionStorage === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(KEY_PREFIX)) keys.push(k);
    }
    for (const k of keys) sessionStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}