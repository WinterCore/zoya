import {Capacitor, CapacitorHttp} from "@capacitor/core";

const CONNECT_TIMEOUT_MS = 15_000;
const READ_TIMEOUT_MS = 30_000;

export interface HttpResult<T> {
  readonly ok: boolean;
  readonly status: number;
  /** The parsed JSON body; only set when `ok`. */
  readonly data: T | null;
}

/**
 * GETs a JSON endpoint. The native app goes through CapacitorHttp, which
 * sidesteps mixed-content and CORS rules for the plain-HTTP WatchPower API.
 * Both paths time out, so a dead connection can't leave a screen loading forever.
 */
export const getJson = async <T>(url: string): Promise<HttpResult<T>> => {
  if (Capacitor.isNativePlatform()) {
    const resp = await CapacitorHttp.get({
      url,
      connectTimeout: CONNECT_TIMEOUT_MS,
      readTimeout: READ_TIMEOUT_MS,
    });
    const ok = resp.status >= 200 && resp.status < 300;
    // The body arrives parsed only when the server labels it as JSON.
    const data = ok ? (typeof resp.data === "string" ? JSON.parse(resp.data) : resp.data) as T : null;
    return { ok, status: resp.status, data };
  }

  const resp = await fetch(url, { signal: AbortSignal.timeout(CONNECT_TIMEOUT_MS + READ_TIMEOUT_MS) });
  return { ok: resp.ok, status: resp.status, data: resp.ok ? await resp.json() as T : null };
};
