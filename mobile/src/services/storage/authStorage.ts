import { Platform } from 'react-native';

/**
 * Authentication storage interface.
 * Abstracted to isolate token storage from the rest of the application.
 */
export interface AuthStorage {
  getToken(): Promise<string | null>;
  setToken(token: string): Promise<void>;
  removeToken(): Promise<void>;
}

const AUTH_TOKEN_KEY = 'feedants_auth_token';

/**
 * Native secure storage adapter using expo-secure-store (Keychain on iOS, Keystore on Android).
 */
export class SecureStoreAdapter implements AuthStorage {
  private getSecureStore() {
    // Dynamically require expo-secure-store only on native runtime
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-secure-store');
  }

  async getToken(): Promise<string | null> {
    try {
      const SecureStore = this.getSecureStore();
      return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  async setToken(token: string): Promise<void> {
    if (!token || typeof token !== 'string') {
      throw new Error('Invalid token provided to auth storage');
    }
    const SecureStore = this.getSecureStore();
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
  }

  async removeToken(): Promise<void> {
    try {
      const SecureStore = this.getSecureStore();
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
    } catch {
      // Ignore errors when deleting non-existent key
    }
  }
}

/**
 * In-memory storage adapter for testing and non-native development.
 *
 * NOTE: Never persists tokens to localStorage or AsyncStorage.
 * In-memory tokens are lost on app reload to maintain security in non-native environments.
 */
export class InMemoryStorageAdapter implements AuthStorage {
  private token: string | null = null;

  async getToken(): Promise<string | null> {
    return this.token;
  }

  async setToken(token: string): Promise<void> {
    if (!token || typeof token !== 'string') {
      throw new Error('Invalid token provided to auth storage');
    }
    this.token = token;
  }

  async removeToken(): Promise<void> {
    this.token = null;
  }
}

/**
 * Determines whether SecureStore is natively available in the current runtime environment.
 */
function isNativeSecureStoreAvailable(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

// Active storage adapter
let currentStorage: AuthStorage = isNativeSecureStoreAvailable()
  ? new SecureStoreAdapter()
  : new InMemoryStorageAdapter();

/**
 * Exported AuthStorage singleton.
 * Hides implementation details from all consumers.
 */
export const authStorage: AuthStorage = {
  getToken: () => currentStorage.getToken(),
  setToken: (token: string) => currentStorage.setToken(token),
  removeToken: () => currentStorage.removeToken(),
};

/**
 * Allows switching the storage adapter (primarily for unit tests and non-native environments).
 */
export function setAuthStorageAdapter(adapter: AuthStorage): void {
  currentStorage = adapter;
}
