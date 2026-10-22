export class TimeoutError extends Error {
  constructor(message = "Request timed out") {
    super(message);
    this.name = "TimeoutError";
  }
}

export type RpcResult<T> = {
  data: T;
  error: { code?: string; message?: string; hint?: string } | null;
};

export function withTimeout<T>(promise: PromiseLike<T>, ms: number, label = "request"): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(`${label} timed out`)), ms);
  });
  return Promise.race([Promise.resolve(promise), timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export function isTimeoutError(error: unknown): boolean {
  if (error instanceof TimeoutError) return true;
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (error instanceof Error) {
    const name = error.name.toLowerCase();
    const message = error.message.toLowerCase();
    return name === "aborterror" || name === "timeouterror" || message.includes("timed out") || message.includes("aborted");
  }
  return false;
}
