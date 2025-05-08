# Asset Monitoring Guide

This document provides comprehensive information on the asset monitoring system implemented for the Brainrot Publishing House platform. It covers structured logging, dashboard configuration, alerting, and troubleshooting.

## 1. Overview

The asset monitoring system tracks all asset operations in the application, including URL generation, asset existence checks, and asset content retrieval. It collects detailed metrics to help identify performance issues, track usage patterns, and detect errors.

### 1.1 Key Components

- **Structured Logging**: Enhanced logging in the VercelBlobAssetService with consistent formats and detailed metrics
- **Dashboard**: Configurable dashboard for visualizing asset access patterns and performance
- **Alerts**: Automated alerts for detecting asset access failures and performance degradation
- **Documentation**: This guide for understanding and maintaining the monitoring system

## 2. Structured Logging

All asset operations are logged with a consistent format that includes:

- **Context**: All asset logs include `context: "asset_monitoring"` for easy filtering
- **Action**: Specific action being performed (e.g., `asset_fetch_start`, `url_generation_complete`)
- **Timestamp**: ISO 8601 timestamp for precise timing information
- **Request ID**: Unique identifier for tracking related log entries
- **Operation**: Name of the operation being performed
- **Path**: Asset path being accessed
- **Metrics**: Detailed performance metrics appropriate to the operation

### 2.1 Log Structure

```json
{
  "message": "Descriptive message",
  "level": "info|warn|error",
  "operation": "getAssetUrl|fetchAsset|etc",
  "path": "assets/audio/hamlet/chapter-01.mp3",
  "requestId": "uuid-for-correlation",
  "context": "asset_monitoring",
  "action": "specific_action",
  "timestamp": "2023-05-08T12:34:56.789Z",
  "metrics": {
    "duration_ms": 123,
    "content_size_bytes": 1024000,
    "attempts": 1,
    "error_type": "not_found"
  }
}
```

### 2.2 Action Types

The following action types are used in the logs:

| Action | Description |
|--------|-------------|
| `url_generation_start` | Start of asset URL generation |
| `url_generation_complete` | Successful URL generation |
| `url_generation_error` | Error during URL generation |
| `asset_existence_check_failed` | Asset existence check failed |
| `asset_fetch_start` | Start of asset content fetch |
| `asset_fetch_success` | Successful asset fetch |
| `asset_fetch_http_error` | HTTP error during asset fetch |
| `asset_fetch_retry` | Retry attempt for asset fetch |
| `asset_fetch_failure` | Final failure of asset fetch |

### 2.3 Metric Types

The following metrics are collected:

| Metric | Description |
|--------|-------------|
| `duration_ms` | Time taken for the operation in milliseconds |
| `content_size_bytes` | Size of the asset in bytes |
| `attempts` | Number of retry attempts |
| `error_type` | Type of error encountered |
| `content_type` | MIME type of the asset |
| `cache_hit` | Whether the request hit the cache |
| `asset_exists` | Whether the asset exists in storage |

## 3. Dashboard Configuration

A pre-configured dashboard is available for monitoring asset access patterns. The dashboard is defined in `/monitoring/asset-dashboard.json` and can be imported into your monitoring platform.

### 3.1 Dashboard Panels

The dashboard includes the following panels:

- **Asset Access Overview**: High-level metrics for asset access
- **Asset Requests by Type**: Distribution of requests by asset type
- **Asset Performance Timeline**: Response times over time
- **Asset Request Volume**: Number of requests over time
- **Top Accessed Assets**: Most frequently accessed assets
- **Error Rate by Operation**: Error rates for different operations
- **Asset Size Distribution**: Distribution of asset sizes
- **Asset Fetch Retries**: Number of retry attempts
- **Cache Hit Ratio**: Percentage of cache hits
- **Recent Errors**: Recent asset access errors

### 3.2 Dashboard Configuration

To configure the dashboard:

1. Install your monitoring platform's dashboard import tool
2. Import the configuration:

```bash
# Example for Grafana
grafana-cli dashboard import /monitoring/asset-dashboard.json
```

3. Configure data sources in your monitoring platform to connect to your log storage
4. Set up any additional filters or time ranges as needed

## 4. Alert Configuration

Automated alerts are configured to notify you of asset access issues. Alerts are defined in `/monitoring/asset-alerts.json` and can be imported into your alerting platform.

### 4.1 Alert Rules

The following alert rules are configured:

| Alert | Description | Threshold | Severity |
|-------|-------------|-----------|----------|
| High Asset Error Rate | Alerts when error rate exceeds threshold | 5% | Critical |
| Slow Asset Response Time | Alerts when response time is slow | 2000ms (P95) | Warning |
| Asset Not Found Spike | Alerts on spike in 'not found' errors | 2x increase | Warning |
| Low Cache Hit Ratio | Alerts when cache hit ratio is low | Below 70% | Info |
| Repeated Asset Fetch Retries | Alerts on multiple retry attempts | >10 in 5min | Warning |
| Critical Asset Access Failure | Alerts on failures for critical assets | >5 in 5min | Critical |
| Sudden Traffic Increase | Alerts on traffic spikes | 3x increase | Info |

### 4.2 Alert Configuration

To configure alerts:

1. Install your alerting platform's import tool
2. Import the configuration:

```bash
# Example for Alertmanager
alertmanager-cli import /monitoring/asset-alerts.json
```

3. Configure notification channels with appropriate credentials:
   - Slack webhook URL
   - Email recipients
   - PagerDuty integration key

4. Test the alerts to ensure they trigger correctly:

```bash
# Simulate high error rate
curl -X POST http://your-alerting-platform/api/test-alert \
  -d '{"id": "high-error-rate", "value": 0.1}'
```

## 5. Implementation Details

### 5.1 Logger Configuration

The asset monitoring system uses the application's main logger, which is configured in `utils/logger.ts`. The logger is extended with context-specific information for asset monitoring.

To customize the logger configuration:

1. Edit the log level in your environment variables:

```
LOG_LEVEL=debug  # For more detailed logging
```

2. Configure log output formats in `utils/logger.ts`:

```typescript
// Example: Add JSON formatting for production
const createServerLogger = () => {
  return pino({
    level: process.env.LOG_LEVEL || 'info',
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },
    timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
  });
};
```

### 5.2 Integration with Monitoring Services

The structured logs can be integrated with various monitoring services:

#### Vercel Logs

For Vercel-deployed applications, logs are automatically collected and can be viewed in the Vercel dashboard.

#### Custom Log Aggregation (e.g., ELK Stack)

1. Configure a log drain to forward logs to your aggregation service
2. Set up appropriate indexes and filters for asset monitoring logs:

```
index pattern: asset-monitoring-*
filter: context:asset_monitoring
```

3. Create visualizations based on the metrics provided in the logs

## 6. Troubleshooting

### 6.1 Common Issues

#### Missing Metrics

If metrics are missing from the logs:

1. Check the log level (should be 'info' or 'debug')
2. Ensure the operation is properly instrumented in VercelBlobAssetService
3. Verify that the context field is set to "asset_monitoring"

#### Alert Storms

If you're getting too many alerts:

1. Adjust thresholds in the alert configuration
2. Increase throttling periods for less critical alerts
3. Consolidate related alerts into a single notification

#### Dashboard Performance

If the dashboard is slow:

1. Reduce the time range for high-volume metrics
2. Increase the aggregation interval for time-series data
3. Limit the number of concurrent panels

### 6.2 Log Query Examples

Here are some useful queries for investigating issues:

#### Find errors for a specific book

```
context:asset_monitoring AND level:error AND bookSlug:hamlet
```

#### Analyze slow asset fetches

```
context:asset_monitoring AND action:asset_fetch_success AND metrics.total_duration_ms:>1000
```

#### Check cache hit ratio

```
context:asset_monitoring AND action:asset_fetch_success AND metrics.caching.cache_hit:*
```

## 7. Maintenance and Evolution

### 7.1 Regular Maintenance

- Review dashboard metrics weekly to identify trends
- Update alert thresholds based on observed patterns
- Clean up old log data according to your retention policy
- Verify that all monitoring components are functioning correctly

### 7.2 Adding New Metrics

To add new metrics to the monitoring system:

1. Identify the new metric to be tracked
2. Add the metric to the appropriate logging statements in VercelBlobAssetService
3. Update the dashboard configuration to include the new metric
4. Add any necessary alert rules for the new metric

### 7.3 Custom Reports

To generate custom reports based on asset monitoring data:

1. Export log data for the desired time period
2. Use a data analysis tool (e.g., pandas, Excel) to process the data
3. Generate visualizations and insights based on the metrics
4. Share the report with stakeholders

## 8. References

- [ASSET_MANAGEMENT_GUIDE.md](./ASSET_MANAGEMENT_GUIDE.md) - Guide for asset management
- [VERCEL_BLOB_CONFIG.md](./VERCEL_BLOB_CONFIG.md) - Vercel Blob configuration documentation
- [Pino Logger Documentation](https://getpino.io/) - Documentation for the Pino logging library
- [Grafana Dashboard Documentation](https://grafana.com/docs/grafana/latest/dashboards/) - For dashboard customization
- [Alertmanager Documentation](https://prometheus.io/docs/alerting/latest/alertmanager/) - For alert customization