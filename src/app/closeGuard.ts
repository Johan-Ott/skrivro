type Flush = () => Promise<boolean>;
type GuardClose = (isSafeToClose: Flush) => () => void;

/** One listener on the window's closing for everything that saves: the window closes only when
 * every flush is done, so a write is never cut off halfway and left as a temp file. */
export function createCloseGuard(guardClose: GuardClose) {
  const flushes = new Set<Flush>();
  let stopGuarding: (() => void) | null = null;
  const flushAll = async () =>
    (await Promise.all([...flushes].map((flush) => flush().catch(() => false)))).every(Boolean);
  const register = (flush: Flush) => {
    flushes.add(flush);
    stopGuarding ??= guardClose(flushAll);
    return () => {
      flushes.delete(flush);
      if (flushes.size > 0) return;
      stopGuarding?.();
      stopGuarding = null;
    };
  };
  return Object.assign(register, { flushAll });
}
