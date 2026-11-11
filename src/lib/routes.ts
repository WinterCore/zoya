export const DEVICE_ROUTE = "/device/:username/:pn";

export const devicePath = (username: string, pn: string) =>
  `/device/${encodeURIComponent(username)}/${encodeURIComponent(pn)}`;

/** Router state for /login: prefill the username, e.g. after a failed saved login. */
export interface LoginRouteState {
  readonly username?: string;
}
