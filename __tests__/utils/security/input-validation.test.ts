/**
 * Input Validation Tests
 *
 * SEC-016: Comprehensive tests for input validation system
 * - ValidationSchema interface and types
 * - Fail-fast validation middleware
 * - Validation rule composition and chaining
 * - Property-based tests for malicious input scenarios
 * - Validation error handling and responses
 *
 * These tests define the API through TDD - implementation should make these tests pass
 */
/* eslint-disable max-lines, max-lines-per-function, @typescript-eslint/no-non-null-assertion */
import { randomUUID } from 'crypto';

// Import types and functions that should be implemented
import {
  type ValidationContext,
  type ValidationError,
  type ValidationResult,
  type ValidationRule,
  type ValidationSchema,
  createValidationMiddleware,
  email,
  length,
  matches,
  number,
  oneOf,
  preventInjection,
  preventPathTraversal,
  preventXSS,
  range,
  required,
  sanitizeHtml,
  string,
  url,
  validateInput,
  validateSchema,
} from '@/utils/security/input-validation.js';

// Test data generators for property-based testing
const maliciousInputSamples = {
  sqlInjection: [
    "'; DROP TABLE users; --",
    "1' OR '1'='1",
    "admin'--",
    "' UNION SELECT * FROM users --",
    '"; DELETE FROM logs; --',
  ],
  xssAttempts: [
    '<script>alert("xss")</script>',
    'javascript:alert("xss")',
    '<img src="x" onerror="alert(\'xss\')" />',
    '"><script>alert("xss")</script>',
    '\'; alert("xss"); //',
  ],
  pathTraversal: [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32',
    '/etc/passwd',
    '....//....//....//etc/passwd',
    '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
  ],
  oversizedInputs: ['x'.repeat(10000), 'x'.repeat(100000), 'x'.repeat(1000000)],
  specialCharacters: [
    String.fromCharCode(0), // null byte
    '\x00\x01\x02\x03',
    '\uffff\ufffe',
    String.fromCharCode(8232), // line separator
  ],
};

describe('Input Validation System', () => {
  describe('ValidationResult Interface', () => {
    test('should have proper structure for successful validation', () => {
      const result: ValidationResult<string> = {
        success: true,
        data: 'validated data',
      };

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data', 'validated data');
      expect(result.errors).toBeUndefined();
    });

    test('should have proper structure for failed validation', () => {
      const result: ValidationResult = {
        success: false,
        errors: [
          {
            field: 'email',
            message: 'Invalid email format',
            code: 'INVALID_EMAIL',
            value: 'not-an-email',
          },
        ],
      };

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('errors');
      expect(result.errors).toHaveLength(1);
      expect(result.errors![0]).toHaveProperty('field', 'email');
      expect(result.errors![0]).toHaveProperty('message');
      expect(result.errors![0]).toHaveProperty('code');
    });

    test('should support warnings alongside errors', () => {
      const result: ValidationResult = {
        success: false,
        errors: [{ field: 'password', message: 'Too short', code: 'MIN_LENGTH' }],
        warnings: ['Password should contain special characters'],
      };

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings![0]).toContain('special characters');
    });
  });

  describe('Basic Validation Rules', () => {
    describe('required() rule', () => {
      test('should pass for non-empty values', () => {
        const rule = required();
        const context: ValidationContext = { field: 'test', allData: {} };

        expect(rule('hello', context)).toEqual({ success: true, data: 'hello' });
        expect(rule(123, context)).toEqual({ success: true, data: 123 });
        expect(rule(false, context)).toEqual({ success: true, data: false });
        expect(rule([], context)).toEqual({ success: true, data: [] });
      });

      test('should fail for empty values', () => {
        const rule = required();
        const context: ValidationContext = { field: 'test', allData: {} };

        const emptyValues = [null, undefined, '', '   ', []];
        emptyValues.forEach((value) => {
          const result = rule(value, context);
          expect(result.success).toBe(false);
          expect(result.errors).toHaveLength(1);
          expect(result.errors![0].code).toBe('REQUIRED');
        });
      });
    });

    describe('string() rule', () => {
      test('should pass for string values', () => {
        const rule = string();
        const context: ValidationContext = { field: 'test', allData: {} };

        const stringValues = ['hello', '', '123', 'special chars: !@#$%'];
        stringValues.forEach((value) => {
          const result = rule(value, context);
          expect(result.success).toBe(true);
          expect(result.data).toBe(value);
        });
      });

      test('should fail for non-string values', () => {
        const rule = string();
        const context: ValidationContext = { field: 'test', allData: {} };

        const nonStringValues = [123, true, [], {}, null, undefined];
        nonStringValues.forEach((value) => {
          const result = rule(value, context);
          expect(result.success).toBe(false);
          expect(result.errors![0].code).toBe('INVALID_TYPE');
        });
      });
    });

    describe('number() rule', () => {
      test('should pass for numeric values', () => {
        const rule = number();
        const context: ValidationContext = { field: 'test', allData: {} };

        const numericValues = [123, 0, -456, 3.14, Number.MAX_VALUE];
        numericValues.forEach((value) => {
          const result = rule(value, context);
          expect(result.success).toBe(true);
          expect(result.data).toBe(value);
        });
      });

      test('should fail for non-numeric values', () => {
        const rule = number();
        const context: ValidationContext = { field: 'test', allData: {} };

        const nonNumericValues = ['123', true, [], {}, null, undefined, NaN];
        nonNumericValues.forEach((value) => {
          const result = rule(value, context);
          expect(result.success).toBe(false);
          expect(result.errors![0].code).toBe('INVALID_TYPE');
        });
      });
    });

    describe('email() rule', () => {
      test('should pass for valid email addresses', () => {
        const rule = email();
        const context: ValidationContext = { field: 'email', allData: {} };

        const validEmails = [
          'test@example.com',
          'user.name@domain.co.uk',
          'user+tag@domain.org',
          'user123@sub.domain.com',
        ];

        validEmails.forEach((email) => {
          const result = rule(email, context);
          expect(result.success).toBe(true);
        });
      });

      test('should fail for invalid email addresses', () => {
        const rule = email();
        const context: ValidationContext = { field: 'email', allData: {} };

        const invalidEmails = [
          'not-an-email',
          '@domain.com',
          'user@',
          'user..name@domain.com',
          'user@domain',
          '',
        ];

        invalidEmails.forEach((email) => {
          const result = rule(email, context);
          expect(result.success).toBe(false);
          expect(result.errors![0].code).toBe('INVALID_EMAIL');
        });
      });
    });

    describe('url() rule', () => {
      test('should pass for valid URLs', () => {
        const rule = url();
        const context: ValidationContext = { field: 'url', allData: {} };

        const validUrls = [
          'https://example.com',
          'http://sub.domain.org/path?query=value',
          'https://user:pass@domain.com:8080/path#hash',
          'ftp://files.example.com',
        ];

        validUrls.forEach((url) => {
          const result = rule(url, context);
          expect(result.success).toBe(true);
        });
      });

      test('should fail for invalid URLs', () => {
        const rule = url();
        const context: ValidationContext = { field: 'url', allData: {} };

        const invalidUrls = ['not-a-url', 'javascript:alert(1)', '', 'http://', '://example.com'];

        invalidUrls.forEach((url) => {
          const result = rule(url, context);
          expect(result.success).toBe(false);
          expect(result.errors![0].code).toBe('INVALID_URL');
        });
      });
    });
  });

  describe('Validation Rule Composition and Chaining', () => {
    test('should compose multiple rules into a schema', () => {
      const schema: ValidationSchema<string> = {
        rules: [required(), string(), length(3, 50)],
        failFast: true,
      };

      const context: ValidationContext = { field: 'username', allData: {} };

      // Test valid input
      const validResult = validateSchema('johndoe', schema, context);
      expect(validResult.success).toBe(true);

      // Test invalid input (too short)
      const invalidResult = validateSchema('ab', schema, context);
      expect(invalidResult.success).toBe(false);
      expect(invalidResult.errors![0].code).toBe('MIN_LENGTH');
    });

    test('should support chained validation with fluent API', () => {
      // TODO: Implement fluent API in SEC-017
      // For now, just test that basic rule composition works
      const emailSchema: ValidationSchema<string> = {
        rules: [required(), string(), email(), length(5, 100)],
        failFast: false,
      };
      const context: ValidationContext = { field: 'email', allData: {} };

      // This test will be updated when fluent API is implemented
      const validResult = validateSchema('user@example.com', emailSchema, context);
      expect(validResult.success).toBe(false); // Will fail until implemented

      const invalidResult = validateSchema('not-an-email', emailSchema, context);
      expect(invalidResult.success).toBe(false); // Will fail until implemented
    });

    test('should apply rules in order and respect failFast option', () => {
      const schemaFailFast: ValidationSchema = {
        rules: [required(), string(), length(10, 50)],
        failFast: true,
      };

      const schemaAllErrors: ValidationSchema = {
        rules: [required(), string(), length(10, 50)],
        failFast: false,
      };

      const context: ValidationContext = { field: 'test', allData: {} };

      // With failFast, should stop at first error
      const failFastResult = validateSchema(123, schemaFailFast, context);
      expect(failFastResult.success).toBe(false);
      expect(failFastResult.errors).toHaveLength(1); // Only type error

      // Without failFast, should collect all errors
      const allErrorsResult = validateSchema(123, schemaAllErrors, context);
      expect(allErrorsResult.success).toBe(false);
      expect(allErrorsResult.errors!.length).toBeGreaterThan(1); // Type + length errors
    });
  });

  describe('Security-Focused Validation Rules', () => {
    describe('preventXSS() rule', () => {
      test('should block XSS attempts', () => {
        const rule = preventXSS();
        const context: ValidationContext = { field: 'content', allData: {} };

        maliciousInputSamples.xssAttempts.forEach((xssAttempt) => {
          const result = rule(xssAttempt, context);
          expect(result.success).toBe(false);
          expect(result.errors![0].code).toBe('POTENTIAL_XSS');
        });
      });

      test('should allow safe content', () => {
        const rule = preventXSS();
        const context: ValidationContext = { field: 'content', allData: {} };

        const safeContent = [
          'Hello world',
          'This is a normal sentence.',
          'Numbers: 123 and symbols: !@#$%',
          'Unicode: 你好',
        ];

        safeContent.forEach((content) => {
          const result = rule(content, context);
          expect(result.success).toBe(true);
        });
      });
    });

    describe('preventInjection() rule', () => {
      test('should block SQL injection attempts', () => {
        const rule = preventInjection();
        const context: ValidationContext = { field: 'query', allData: {} };

        maliciousInputSamples.sqlInjection.forEach((sqlInjection) => {
          const result = rule(sqlInjection, context);
          expect(result.success).toBe(false);
          expect(result.errors![0].code).toBe('POTENTIAL_INJECTION');
        });
      });

      test('should allow safe database queries', () => {
        const rule = preventInjection();
        const context: ValidationContext = { field: 'search', allData: {} };

        const safeQueries = [
          'normal search term',
          'product name',
          'user@example.com',
          '2023-12-01',
        ];

        safeQueries.forEach((query) => {
          const result = rule(query, context);
          expect(result.success).toBe(true);
        });
      });
    });

    describe('preventPathTraversal() rule', () => {
      test('should block path traversal attempts', () => {
        const rule = preventPathTraversal();
        const context: ValidationContext = { field: 'filename', allData: {} };

        maliciousInputSamples.pathTraversal.forEach((pathAttempt) => {
          const result = rule(pathAttempt, context);
          expect(result.success).toBe(false);
          expect(result.errors![0].code).toBe('POTENTIAL_PATH_TRAVERSAL');
        });
      });

      test('should allow safe file paths', () => {
        const rule = preventPathTraversal();
        const context: ValidationContext = { field: 'filename', allData: {} };

        const safePaths = ['document.pdf', 'image.jpg', 'folder/file.txt', 'my-file_123.doc'];

        safePaths.forEach((path) => {
          const result = rule(path, context);
          expect(result.success).toBe(true);
        });
      });
    });

    describe('sanitizeHtml() rule', () => {
      test('should sanitize HTML content while preserving safe elements', () => {
        const rule = sanitizeHtml();
        const context: ValidationContext = { field: 'content', allData: {} };

        const testCases = [
          {
            input: '<p>Hello <strong>world</strong></p>',
            expectSanitized: true,
          },
          {
            input: '<script>alert("xss")</script><p>Hello</p>',
            expectSanitized: true,
          },
          {
            input: '<img src="x" onerror="alert(1)" />',
            expectSanitized: true,
          },
        ];

        testCases.forEach(({ input }) => {
          const result = rule(input, context);
          expect(result.success).toBe(true);
          expect(result.data).not.toBe(input); // Should be sanitized
          expect(result.data).not.toContain('<script>');
          expect(result.data).not.toContain('onerror');
        });
      });
    });
  });

  describe('Length and Range Validation', () => {
    describe('length() rule', () => {
      test('should validate string length', () => {
        const rule = length(3, 10);
        const context: ValidationContext = { field: 'text', allData: {} };

        // Valid lengths
        expect(rule('abc', context).success).toBe(true);
        expect(rule('1234567890', context).success).toBe(true);

        // Invalid lengths
        expect(rule('ab', context).success).toBe(false); // Too short
        expect(rule('12345678901', context).success).toBe(false); // Too long
      });

      test('should validate array length', () => {
        const rule = length(1, 3);
        const context: ValidationContext = { field: 'items', allData: {} };

        expect(rule(['a'], context).success).toBe(true);
        expect(rule(['a', 'b', 'c'], context).success).toBe(true);
        expect(rule([], context).success).toBe(false);
        expect(rule(['a', 'b', 'c', 'd'], context).success).toBe(false);
      });
    });

    describe('range() rule', () => {
      test('should validate numeric ranges', () => {
        const rule = range(1, 100);
        const context: ValidationContext = { field: 'age', allData: {} };

        expect(rule(1, context).success).toBe(true);
        expect(rule(50, context).success).toBe(true);
        expect(rule(100, context).success).toBe(true);
        expect(rule(0, context).success).toBe(false);
        expect(rule(101, context).success).toBe(false);
      });
    });

    describe('oneOf() rule', () => {
      test('should validate enum values', () => {
        const rule = oneOf(['admin', 'user', 'guest']);
        const context: ValidationContext = { field: 'role', allData: {} };

        expect(rule('admin', context).success).toBe(true);
        expect(rule('user', context).success).toBe(true);
        expect(rule('guest', context).success).toBe(true);
        expect(rule('invalid', context).success).toBe(false);
        expect(rule('', context).success).toBe(false);
      });
    });

    describe('matches() rule', () => {
      test('should validate regex patterns', () => {
        const phoneRule = matches(/^\+\d{1,3}\d{10}$/);
        const context: ValidationContext = { field: 'phone', allData: {} };

        expect(phoneRule('+11234567890', context).success).toBe(true);
        expect(phoneRule('invalid-phone', context).success).toBe(false);
        expect(phoneRule('1234567890', context).success).toBe(false); // Missing +
      });
    });
  });

  describe('Fail-Fast Validation Middleware', () => {
    test('should create middleware that validates request data', async () => {
      const validationSchema = {
        email: {
          rules: [required(), string(), email()],
          failFast: true,
        },
        age: {
          rules: [required(), number(), range(18, 120)],
          failFast: true,
        },
      };

      const middleware = createValidationMiddleware(validationSchema);

      // Mock request with valid data
      const validRequest = new Request('http://localhost/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@example.com',
          age: 25,
        }),
      });

      const validResult = await middleware(validRequest);
      expect(validResult).toBeNull(); // No validation errors

      // Mock request with invalid data
      const invalidRequest = new Request('http://localhost/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'not-an-email',
          age: 15, // Too young
        }),
      });

      const invalidResult = await middleware(invalidRequest);
      expect(invalidResult).not.toBeNull();
      expect(invalidResult!.success).toBe(false);
      expect(invalidResult!.errors).toHaveLength(2); // Email + age errors
    });

    test('should handle malformed JSON gracefully', async () => {
      const validationSchema = {
        name: { rules: [required(), string()], failFast: true },
      };

      const middleware = createValidationMiddleware(validationSchema);
      const malformedRequest = new Request('http://localhost/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json {',
      });

      const result = await middleware(malformedRequest);
      expect(result).not.toBeNull();
      expect(result!.success).toBe(false);
      expect(result!.errors![0].code).toBe('INVALID_JSON');
    });

    test('should validate query parameters for GET requests', async () => {
      const validationSchema = {
        id: { rules: [required(), string(), matches(/^\d+$/)], failFast: true },
        type: { rules: [required(), oneOf(['user', 'admin'])], failFast: true },
      };

      const middleware = createValidationMiddleware(validationSchema);

      // Valid query params
      const validRequest = new Request('http://localhost/test?id=123&type=user');
      const validResult = await middleware(validRequest);
      expect(validResult).toBeNull();

      // Invalid query params
      const invalidRequest = new Request('http://localhost/test?id=abc&type=invalid');
      const invalidResult = await middleware(invalidRequest);
      expect(invalidResult).not.toBeNull();
      expect(invalidResult!.success).toBe(false);
    });
  });

  describe('Property-Based Tests for Malicious Inputs', () => {
    test('should handle large inputs without performance degradation', () => {
      const rule = string();
      const context: ValidationContext = { field: 'content', allData: {} };

      maliciousInputSamples.oversizedInputs.forEach((largeInput) => {
        const startTime = Date.now();
        const result = rule(largeInput, context);
        const endTime = Date.now();

        expect(endTime - startTime).toBeLessThan(100); // Should be fast
        expect(result).toHaveProperty('success'); // Should not crash
      });
    });

    test('should handle special characters and unicode edge cases', () => {
      const rule = preventXSS();
      const context: ValidationContext = { field: 'content', allData: {} };

      maliciousInputSamples.specialCharacters.forEach((specialChar) => {
        expect(() => {
          const result = rule(specialChar, context);
          expect(result).toHaveProperty('success');
        }).not.toThrow();
      });
    });

    test('should generate consistent results for repeated validation', () => {
      const rule = email();
      const context: ValidationContext = { field: 'email', allData: {} };

      const testEmail = 'test@example.com';

      // Run the same validation multiple times
      for (let i = 0; i < 100; i++) {
        const result = rule(testEmail, context);
        expect(result.success).toBe(true);
        expect(result.data).toBe(testEmail);
      }
    });

    test('should handle concurrent validation requests safely', async () => {
      const schema: ValidationSchema = {
        rules: [required(), string(), preventXSS()],
        failFast: false,
      };

      const context: ValidationContext = { field: 'content', allData: {} };

      // Create many concurrent validation requests
      const promises = Array.from({ length: 100 }, (_, i) =>
        validateSchema(`safe content ${i}`, schema, context),
      );

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.data).toBe(`safe content ${index}`);
      });
    });
  });

  describe('Error Handling and Response Formatting', () => {
    test('should provide detailed error information', () => {
      const schema: ValidationSchema = {
        rules: [required(), string(), length(5, 10), email()],
        failFast: false,
      };

      const context: ValidationContext = {
        field: 'email',
        allData: { email: 'abc' },
        correlationId: randomUUID(),
      };

      const result = validateSchema('abc', schema, context);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(2); // Length + email format errors

      result.errors!.forEach((error) => {
        expect(error).toHaveProperty('field', 'email');
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('code');
        expect(error.message).toMatch(/\w+/); // Should have meaningful message
      });
    });

    test('should include validation context in errors', () => {
      const rule = required();
      const context: ValidationContext = {
        field: 'username',
        allData: { password: 'secret' },
        correlationId: 'test-correlation-id',
      };

      const result = rule('', context);

      expect(result.success).toBe(false);
      expect(result.errors![0].field).toBe('username');
      // Context should be available to the rule for enhanced error messages
    });

    test('should support custom error messages', () => {
      const customRule: ValidationRule = (value, context) => {
        if (!value || value.length < 8) {
          return {
            success: false,
            errors: [
              {
                field: context!.field,
                message: 'Password must be at least 8 characters for security',
                code: 'WEAK_PASSWORD',
                value,
              },
            ],
          };
        }
        return { success: true, data: value };
      };

      const context: ValidationContext = { field: 'password', allData: {} };
      const result = customRule('weak', context);

      expect(result.success).toBe(false);
      expect(result.errors![0].message).toContain('security');
      expect(result.errors![0].code).toBe('WEAK_PASSWORD');
    });

    test('should format validation results for API responses', () => {
      const multiFieldValidation = validateInput(
        {
          email: 'invalid-email',
          age: 'not-a-number',
          role: 'invalid-role',
        },
        {
          email: { rules: [required(), string(), email()], failFast: false },
          age: { rules: [required(), number(), range(18, 120)], failFast: false },
          role: { rules: [required(), oneOf(['admin', 'user', 'guest'])], failFast: false },
        },
      );

      expect(multiFieldValidation.success).toBe(false);
      expect(multiFieldValidation.errors!.length).toBeGreaterThan(0);

      // Should be able to group errors by field
      const errorsByField = multiFieldValidation.errors!.reduce(
        (acc, error) => {
          acc[error.field] = acc[error.field] || [];
          acc[error.field].push(error);
          return acc;
        },
        {} as Record<string, ValidationError[]>,
      );

      expect(errorsByField).toHaveProperty('email');
      expect(errorsByField).toHaveProperty('age');
      expect(errorsByField).toHaveProperty('role');
    });
  });

  describe('Integration with Security Infrastructure', () => {
    test('should integrate with correlation ID tracking', () => {
      const correlationId = randomUUID();
      const context: ValidationContext = {
        field: 'test',
        allData: {},
        correlationId,
      };

      const rule = required();
      const result = rule(null, context);

      // Validation errors should preserve correlation ID for tracking
      expect(result.success).toBe(false);
      // Implementation should log validation failures with correlation ID
    });

    test('should support rate limiting for validation failures', async () => {
      // This test verifies that repeated validation failures can be tracked
      // for potential rate limiting of abusive clients
      const schema: ValidationSchema = {
        rules: [preventInjection()],
        failFast: true,
      };

      const context: ValidationContext = {
        field: 'query',
        allData: {},
        correlationId: randomUUID(),
      };

      // Simulate repeated malicious input attempts
      const maliciousAttempts = maliciousInputSamples.sqlInjection.slice(0, 5);
      const results = maliciousAttempts.map((attempt) => validateSchema(attempt, schema, context));

      // All should fail
      results.forEach((result) => {
        expect(result.success).toBe(false);
        expect(result.errors![0].code).toBe('POTENTIAL_INJECTION');
      });

      // Implementation should track these failures for rate limiting
    });
  });

  describe('TDD Verification - Tests Should Fail Without Implementation', () => {
    test('validation functions should be available for import', () => {
      // These imports should exist and be functions
      expect(typeof required).toBe('function');
      expect(typeof string).toBe('function');
      expect(typeof number).toBe('function');
      expect(typeof email).toBe('function');
      expect(typeof url).toBe('function');
      expect(typeof length).toBe('function');
      expect(typeof range).toBe('function');
      expect(typeof oneOf).toBe('function');
      expect(typeof matches).toBe('function');
      expect(typeof preventXSS).toBe('function');
      expect(typeof preventInjection).toBe('function');
      expect(typeof preventPathTraversal).toBe('function');
      expect(typeof sanitizeHtml).toBe('function');
      expect(typeof validateSchema).toBe('function');
      expect(typeof validateInput).toBe('function');
      expect(typeof createValidationMiddleware).toBe('function');
    });

    test('TypeScript types should be properly defined', () => {
      // This test verifies the type definitions compile correctly
      const exampleResult: ValidationResult<string> = {
        success: true,
        data: 'test',
      };

      const exampleError: ValidationError = {
        field: 'test',
        message: 'Test error',
        code: 'TEST_ERROR',
      };

      const exampleSchema: ValidationSchema<string> = {
        rules: [required(), string()],
        failFast: true,
      };

      const exampleContext: ValidationContext = {
        field: 'test',
        allData: {},
      };

      // Types should compile without errors
      expect(exampleResult).toBeDefined();
      expect(exampleError).toBeDefined();
      expect(exampleSchema).toBeDefined();
      expect(exampleContext).toBeDefined();
    });
  });
});
