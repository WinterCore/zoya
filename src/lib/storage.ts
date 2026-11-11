import {SecureStorage} from "@aparajita/capacitor-secure-storage";

/**
 * Everything the app persists goes through here. On Android, SecureStorage
 * encrypts each value with AES-GCM using a key held in the Android Keystore.
 * In the browser (development only) it falls back to localStorage.
 */
export namespace Storage {
  export function setItem(key: string, value: string): Promise<void> {
    return SecureStorage.setItem(key, value);
  }

  export function getItem(key: string): Promise<string | null> {
    return SecureStorage.getItem(key);
  }

  export function removeItem(key: string): Promise<void> {
    return SecureStorage.removeItem(key);
  }

  export function keys(): Promise<string[]> {
    return SecureStorage.keys();
  }

  export async function getJSON<T>(key: string): Promise<T | null> {
    const value = await getItem(key);
    if (value === null) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Ignoring unreadable value for "${key}":`, error);
      return null;
    }
  }

  export function setJSON(key: string, value: unknown): Promise<void> {
    return setItem(key, JSON.stringify(value));
  }
}
