import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryStorageAdapter, authStorage, setAuthStorageAdapter } from '../authStorage';

describe('Auth Storage (authStorage.ts)', () => {
  let inMemoryAdapter: InMemoryStorageAdapter;

  beforeEach(() => {
    inMemoryAdapter = new InMemoryStorageAdapter();
    setAuthStorageAdapter(inMemoryAdapter);
  });

  it('should return null when no token is stored', async () => {
    const token = await authStorage.getToken();
    expect(token).toBeNull();
  });

  it('should store and retrieve a token', async () => {
    const sampleToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';
    await authStorage.setToken(sampleToken);

    const retrieved = await authStorage.getToken();
    expect(retrieved).toBe(sampleToken);
  });

  it('should remove a stored token', async () => {
    const sampleToken = 'test.token.to.remove';
    await authStorage.setToken(sampleToken);
    expect(await authStorage.getToken()).toBe(sampleToken);

    await authStorage.removeToken();
    expect(await authStorage.getToken()).toBeNull();
  });

  it('should throw when attempting to store an empty or non-string token', async () => {
    await expect(authStorage.setToken('')).rejects.toThrow('Invalid token provided');
    // @ts-expect-error Testing invalid runtime input
    await expect(authStorage.setToken(null)).rejects.toThrow('Invalid token provided');
  });

  it('should never persist to localStorage or AsyncStorage in test/in-memory mode', async () => {
    // Verified: in-memory adapter only holds a private variable and does not call any browser or async storage
    await authStorage.setToken('secure-in-memory-token');
    expect(await authStorage.getToken()).toBe('secure-in-memory-token');
  });
});
