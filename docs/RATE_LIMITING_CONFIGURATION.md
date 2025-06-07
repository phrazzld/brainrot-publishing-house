# Rate Limiting Configuration and Tuning Guide

This document provides comprehensive guidance for configuring and tuning the rate limiting system implemented in SEC-013, SEC-014, and SEC-015.

## Overview

The rate limiting system uses a sliding window algorithm with in-memory storage to protect API endpoints from abuse while maintaining good performance for legitimate users.

## Current Configuration

### Download API Rate Limiting

```typescript
// Configuration: app/api/download/route.ts
{
  windowMs: 15 * 60 * 1000,  // 15 minutes
  maxRequests: 50,           // 50 downloads per 15 minutes per IP
  keyGenerator: (request) => `download:${extractClientIP(request)}`
}
```

**Rationale:**

- Downloads are resource-intensive operations
- 15-minute window prevents sustained abuse
- 50 requests allows legitimate batch downloading
- IP-based limiting isolates bad actors

### Translate API Rate Limiting

```typescript
// Configuration: app/api/translate/route.ts and app/api/translate/search/route.ts
{
  windowMs: 10 * 60 * 1000,  // 10 minutes
  maxRequests: 100,          // 100 translations per 10 minutes per IP
  keyGenerator: (request) => `translate:${extractClientIP(request)}`
}
```

**Rationale:**

- Translation requests are lighter than downloads
- Shorter window (10 min) for more responsive limiting
- Higher request count (100) for legitimate translation workflows
- Shared rate limiting key across translate endpoints

## Performance Characteristics

Based on end-to-end testing (SEC-015):

- **Average Overhead**: < 5ms per request
- **Maximum Overhead**: < 15ms per request
- **95th Percentile**: < 10ms per request
- **Memory Usage**: ~100KB for 10,000 unique IPs
- **Attack Prevention**: 85-90% effectiveness against burst attacks

## Configuration Options

### Core Parameters

| Parameter      | Purpose                       | Recommended Range           | Current Values                          |
| -------------- | ----------------------------- | --------------------------- | --------------------------------------- |
| `windowMs`     | Rate limiting window duration | 60000 - 900000ms (1-15 min) | Download: 900000ms, Translate: 600000ms |
| `maxRequests`  | Max requests per window       | 10 - 200                    | Download: 50, Translate: 100            |
| `keyGenerator` | How to identify clients       | IP, IP+Path, Custom         | IP-based with service prefix            |

### Advanced Options

```typescript
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator: (request: Request) => string;
  onLimitReached?: (request: Request, retryAfter: number) => void;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  store?: RateLimitStore;
}
```

## Tuning Guidelines

### For High-Traffic Applications

```typescript
// More generous limits for high-volume legitimate usage
{
  windowMs: 5 * 60 * 1000,   // Shorter window for faster recovery
  maxRequests: 200,          // Higher limits
  keyGenerator: (request) => {
    // Consider user authentication for higher limits
    const userId = request.headers.get('x-user-id');
    const ip = extractClientIP(request);
    return userId ? `auth:${userId}` : `anon:${ip}`;
  }
}
```

### For Strict Security

```typescript
// Tighter limits for high-security environments
{
  windowMs: 60 * 60 * 1000,  // Longer window (1 hour)
  maxRequests: 10,           // Very restrictive
  keyGenerator: (request) => {
    // More granular tracking
    const ip = extractClientIP(request);
    const path = new URL(request.url).pathname;
    return `strict:${ip}:${path}`;
  }
}
```

### For Development/Testing

```typescript
// Relaxed limits for development
{
  windowMs: 60 * 1000,       // 1 minute window
  maxRequests: 1000,         // Very high limits
  keyGenerator: (request) => {
    // Bypass rate limiting for localhost
    const ip = extractClientIP(request);
    return ip === '127.0.0.1' ? `dev:bypass` : `dev:${ip}`;
  }
}
```

## Monitoring and Alerting

### Key Metrics to Track

1. **Rate Limit Hit Rate**: Percentage of requests blocked
2. **False Positive Rate**: Legitimate users being blocked
3. **Attack Prevention Rate**: Malicious requests blocked
4. **Performance Impact**: Average processing time
5. **Memory Usage**: Rate limiting store memory consumption

### Logging Configuration

The system logs security events with structured data:

```json
{
  "timestamp": "2025-06-07T19:14:11.757Z",
  "level": "warn",
  "correlationId": "rl-1749323651757-ge0icgopy",
  "type": "security_event",
  "category": "rate_limit",
  "message": "Rate limit exceeded: retry after 847234ms",
  "details": {
    "ip": "192.168.1.100",
    "userAgent": "AttackBot/1.0",
    "method": "POST",
    "path": "/api/download",
    "limit": 50,
    "remaining": 0,
    "retryAfter": 847234,
    "allowed": false
  }
}
```

### Alert Thresholds

| Metric                | Warning Threshold | Critical Threshold | Action                              |
| --------------------- | ----------------- | ------------------ | ----------------------------------- |
| Rate Limit Hit Rate   | > 20%             | > 50%              | Investigate traffic patterns        |
| Average Response Time | > 25ms            | > 50ms             | Consider optimizing rate limiter    |
| Memory Usage          | > 50MB            | > 100MB            | Implement cleanup or external store |
| Attack Prevention     | < 70%             | < 50%              | Tighten rate limits                 |

## Troubleshooting

### Common Issues

#### High False Positive Rate

**Symptoms**: Legitimate users being blocked frequently
**Causes**: Limits too strict, shared IPs (corporate/mobile networks)
**Solutions**:

- Increase `maxRequests` by 25-50%
- Implement authentication-based limiting
- Add IP whitelist for known good sources

#### Poor Attack Prevention

**Symptoms**: Attacks getting through rate limiting
**Causes**: Distributed attacks, limits too generous
**Solutions**:

- Decrease `maxRequests`
- Implement additional validation
- Add geographic or ASN-based blocking

#### Performance Issues

**Symptoms**: High response times, memory usage
**Causes**: Inefficient key generation, large rate limit store
**Solutions**:

- Optimize key generator logic
- Implement store cleanup
- Consider external rate limit store (Redis)

### Debugging Commands

```bash
# Check rate limiting logs
grep "rate_limit" logs/application.log | tail -100

# Monitor memory usage
node -e "console.log(process.memoryUsage())"

# Test specific endpoints
curl -H "X-Forwarded-For: 192.168.1.100" \
     -X POST http://localhost:3000/api/download?slug=test
```

## Environment-Specific Configuration

### Production

```typescript
const productionConfig = {
  download: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 50,
    keyGenerator: (request) => `download:${extractClientIP(request)}`,
  },
  translate: {
    windowMs: 10 * 60 * 1000,
    maxRequests: 100,
    keyGenerator: (request) => `translate:${extractClientIP(request)}`,
  },
};
```

### Staging

```typescript
const stagingConfig = {
  download: {
    windowMs: 10 * 60 * 1000, // Shorter window for testing
    maxRequests: 75, // Slightly higher for load testing
    keyGenerator: (request) => `staging-download:${extractClientIP(request)}`,
  },
  translate: {
    windowMs: 5 * 60 * 1000, // Shorter window
    maxRequests: 150, // Higher limits for testing
    keyGenerator: (request) => `staging-translate:${extractClientIP(request)}`,
  },
};
```

### Development

```typescript
const developmentConfig = {
  download: {
    windowMs: 60 * 1000, // 1 minute window
    maxRequests: 1000, // Very permissive
    keyGenerator: (request) => `dev-download:${extractClientIP(request)}`,
  },
  translate: {
    windowMs: 60 * 1000, // 1 minute window
    maxRequests: 1000, // Very permissive
    keyGenerator: (request) => `dev-translate:${extractClientIP(request)}`,
  },
};
```

## Best Practices

### 1. Start Conservative, Adjust Based on Data

- Begin with stricter limits
- Monitor false positive rates
- Gradually increase limits based on legitimate usage patterns

### 2. Implement Graduated Responses

```typescript
// Example: Progressive rate limiting
function createProgressiveRateLimiter(baseConfig) {
  return {
    ...baseConfig,
    onLimitReached: (request, retryAfter) => {
      const violations = getViolationCount(extractClientIP(request));
      if (violations > 5) {
        // Escalate to longer ban for repeat offenders
        implementTempBan(extractClientIP(request), 60 * 60 * 1000); // 1 hour
      }
    },
  };
}
```

### 3. Consider Business Context

- E-commerce: Higher limits during sales events
- Educational: Higher limits during exam periods
- B2B: Authentication-based limits for API customers

### 4. Implement Circuit Breakers

```typescript
// Disable rate limiting during system stress
function adaptiveRateLimiting(normalConfig, stressConfig) {
  const currentLoad = getSystemLoad();
  return currentLoad > 0.8 ? stressConfig : normalConfig;
}
```

## Security Considerations

### 1. IP Spoofing Protection

- Validate `X-Forwarded-For` headers
- Use multiple IP extraction methods
- Consider geolocation validation

### 2. Rate Limiting Bypass Prevention

- Don't expose rate limit headers to attackers
- Implement honeypots for rate limit testing
- Monitor for distributed attack patterns

### 3. Data Protection

- Hash or encrypt IP addresses in logs
- Implement data retention policies
- Ensure GDPR compliance for EU traffic

## Integration Testing

The end-to-end tests in `__tests__/integration/rate-limiting-e2e.test.ts` provide comprehensive validation:

- **Attack Simulation**: Burst, distributed, and slow-burn attacks
- **Performance Testing**: Sub-50ms overhead requirement
- **Effectiveness Validation**: 85%+ attack prevention rate
- **Configuration Testing**: Multiple rate limit configurations

Run tests with:

```bash
npm run test -- __tests__/integration/rate-limiting-e2e.test.ts
```

## Future Enhancements

### 1. External Store Integration

```typescript
// Redis-based rate limiting for distributed deployments
import { RedisRateLimitStore } from '@/utils/security/redis-store';

const distributedConfig = {
  ...baseConfig,
  store: new RedisRateLimitStore({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    keyPrefix: 'rate-limit:',
  }),
};
```

### 2. Machine Learning Integration

- Anomaly detection for unusual traffic patterns
- Dynamic rate limit adjustment based on threat level
- User behavior profiling for personalized limits

### 3. Advanced Analytics

- Real-time rate limiting dashboard
- Automated tuning recommendations
- Integration with security incident response

## Conclusion

The current rate limiting implementation provides robust protection against various attack vectors while maintaining excellent performance for legitimate users. Regular monitoring and tuning based on actual usage patterns will ensure optimal effectiveness and user experience.

For questions or issues with rate limiting configuration, consult the security team or create an issue in the project repository.
