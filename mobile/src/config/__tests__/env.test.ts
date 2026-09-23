import { describe, expect, it } from 'vitest';
import { normalizeApiUrl, resolveApiBaseUrl } from '../env';

describe('Environment Configuration (env.ts)', () => {
  describe('normalizeApiUrl', () => {
    it('should strip trailing single slash', () => {
      expect(normalizeApiUrl('http://localhost:5000/')).toBe('http://localhost:5000');
    });

    it('should strip multiple trailing slashes', () => {
      expect(normalizeApiUrl('http://localhost:5000///')).toBe('http://localhost:5000');
    });

    it('should keep url without trailing slash untouched', () => {
      expect(normalizeApiUrl('http://localhost:5000')).toBe('http://localhost:5000');
    });

    it('should trim surrounding whitespace', () => {
      expect(normalizeApiUrl('  http://10.0.2.2:5000/  ')).toBe('http://10.0.2.2:5000');
    });
  });

  describe('resolveApiBaseUrl', () => {
    it('should resolve and normalize a valid URL passed directly', () => {
      const url = resolveApiBaseUrl('http://192.168.1.100:5000/');
      expect(url).toBe('http://192.168.1.100:5000');
    });

    it('should throw a clear error when URL is undefined or empty', () => {
      expect(() => resolveApiBaseUrl(undefined)).toThrow(
        'Missing EXPO_PUBLIC_API_URL environment variable'
      );
      expect(() => resolveApiBaseUrl('')).toThrow(
        'Missing EXPO_PUBLIC_API_URL environment variable'
      );
      expect(() => resolveApiBaseUrl('   ')).toThrow(
        'Missing EXPO_PUBLIC_API_URL environment variable'
      );
    });
  });
});
