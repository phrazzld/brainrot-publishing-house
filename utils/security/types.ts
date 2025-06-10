/**
 * Core security types and interfaces
 */

/**
 * Security event for logging and monitoring
 */
export interface SecurityEvent {
  correlationId: string;
  timestamp: string;
  type: 'rate_limit' | 'validation_failure' | 'security_header' | 'vulnerability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  details: Record<string, unknown>;
}

/**
 * Security headers configuration interface
 */
export interface SecurityHeaders {
  contentSecurityPolicy: string;
  strictTransportSecurity: string;
  xFrameOptions: string;
  xContentTypeOptions: string;
  referrerPolicy: string;
}

/**
 * Rate limiting configuration interface
 */
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests: boolean;
}

/**
 * Input validation schema interface
 */
export interface ValidationSchema {
  [key: string]: ValidationRule[];
}

/**
 * Validation rule definition
 */
export interface ValidationRule {
  type: 'required' | 'string' | 'number' | 'email' | 'url' | 'custom';
  min?: number;
  max?: number;
  pattern?: RegExp;
  validator?: (value: unknown) => boolean;
  message?: string;
}

/**
 * Security audit result interface
 */
export interface AuditResult {
  timestamp: string;
  checks: SecurityCheck[];
  score: number;
  recommendations: string[];
}

/**
 * Individual security check result
 */
export interface SecurityCheck {
  id: string;
  name: string;
  passed: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation?: string;
}
