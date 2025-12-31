import {Platform} from "react-native";
import * as SecureStore from "expo-secure-store";

export namespace Storage {
  export function setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      localStorage.setItem(key, value);
      return Promise.resolve();
    }

    return SecureStore.setItemAsync(key, value);
  }
  
  export function getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      const value = localStorage.getItem(key);
      return Promise.resolve(value);
    }
    
    return SecureStore.getItemAsync(key);
  }

  export function removeItem(key: string): Promise<void> {
    if (Platform.OS === "web") {
      localStorage.removeItem(key);
      return Promise.resolve();
    }

    return SecureStore.deleteItemAsync(key);
  }
}
