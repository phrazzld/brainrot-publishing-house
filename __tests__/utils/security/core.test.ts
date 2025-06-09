/**
 * Core Security Tests
 *
 * Test coverage for essential security utilities.
 */
import { NextRequest } from 'next/server';

import {
  checkRateLimit,
  createSecurityHeadersInline,
  sanitizeString,
} from '../../../utils/security/core';

describe('Core Security Utilities', () => {
  describe('createSecurityHeadersInline', () => {
    it('should return security headers', () => {
      const headers = createSecurityHeadersInline();

      expect(headers['Content-Security-Policy']).toContain("default-src 'self'");
      expect(headers['Strict-Transport-Security']).toBe('max-age=31536000; includeSubDomains');
      expect(headers['X-Frame-Options']).toBe('DENY');
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
    });
  });

  describe('sanitizeString', () => {
    it('should remove dangerous characters', () => {
      expect(sanitizeString('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
      expect(sanitizeString('javascript:alert("xss")')).toBe('alert("xss")');
    });

    it('should preserve safe content', () => {
      expect(sanitizeString('The Iliad by Homer')).toBe('The Iliad by Homer');
    });
  });

  describe('checkRateLimit', () => {
    it('should allow requests within limit', () => {
      // Mock NextRequest for testing
      const mockRequest = {
        ip: '192.168.1.1',
        headers: {
          get: jest.fn().mockReturnValue('192.168.1.1'),
        },
      } as unknown as NextRequest;

      expect(checkRateLimit(mockRequest, 10)).toBe(true);
    });
  });
});
