# Production Monitoring Setup Guide

## Overview

This guide covers comprehensive monitoring setup for NodeAngularFullStack application deployed on
Digital Ocean App Platform.

## Monitoring Stack

### 1. Error Tracking - Sentry

Sentry provides real-time error tracking and performance monitoring.

#### Setup Steps:

1. **Create Sentry Account**: https://sentry.io
2. **Create New Project**: Select Node.js and Angular
3. **Configure DSN**: Set environment variables in Digital Ocean App Platform
   ```bash
   SENTRY_DSN=https://your-dsn@sentry.io/project-id
   ```

#### Sentry Configuration:

```typescript
// Already implemented in monitoring.utils.ts
initializeSentry(); // Call at application startup
```

#### Performance Monitoring:

- **Transaction Sampling**: 10% in production, 100% in development
- **Profiling**: Enabled for performance insights
- **Custom Metrics**: Business metrics tracking
- **Error Filtering**: Health checks and validation errors filtered

### 2. Logging - Winston + Logtail

Structured logging with cloud aggregation via Logtail.

#### Setup Steps:

1. **Create Logtail Account**: https://logtail.com
2. **Create Source**: Node.js application
3. **Configure Token**: Set in Digital Ocean App Platform
   ```bash
   LOGTAIL_TOKEN=your-logtail-token
   ```

#### Log Levels:

- **Error**: Application errors, exceptions
- **Warn**: Performance issues, security events
- **Info**: Business events, user actions
- **HTTP**: API requests and responses
- **Debug**: Detailed debugging information

#### Log Structure:

```json
{
  "timestamp": "2024-01-20T10:30:00.000Z",
  "level": "info",
  "message": "User login successful",
  "environment": "production",
  "service": "api",
  "correlationId": "req_123456",
  "event": "auth.login",
  "userId": "user-123",
  "email": "user@example.com"
}
```

### 3. Application Metrics - Custom Implementation

Business and technical metrics tracking.

#### Key Metrics Tracked:

- **API Requests**: Count, response time, status codes
- **Database Operations**: Query count, response time
- **Authentication Events**: Login, logout, failures
- **File Operations**: Upload, download, storage usage
- **Security Events**: Rate limiting, unauthorized access

#### Metrics Dashboard:

Access metrics through:

- Sentry Performance Dashboard
- Logtail Analytics
- Digital Ocean App Platform Insights

## Health Check Endpoints

### 1. Liveness Probe

```
GET /api/v1/health/liveness
```

- **Purpose**: Container restart decision
- **Response Time**: < 5 seconds
- **Checks**: Basic application responsiveness

### 2. Readiness Probe

```
GET /api/v1/health/readiness
```

- **Purpose**: Traffic routing decision
- **Response Time**: < 10 seconds
- **Checks**: Database connectivity, external services

### 3. Comprehensive Health Check

```
GET /api/v1/health
```

- **Purpose**: Detailed system status
- **Response Time**: < 15 seconds
- **Checks**: All system components, metrics

## Digital Ocean App Platform Integration

### 1. Built-in Monitoring

Digital Ocean App Platform provides:

- **CPU and Memory Usage**: Real-time metrics
- **Request Volume**: HTTP request counts
- **Response Times**: Average response times
- **Error Rates**: HTTP error percentages

#### Access Monitoring:

1. Go to Digital Ocean Dashboard
2. Select your App
3. Navigate to "Insights" tab
4. View real-time metrics and historical data

### 2. Log Aggregation

Digital Ocean automatically collects:

- **Application Logs**: stdout/stderr from containers
- **Access Logs**: HTTP request logs
- **Build Logs**: Deployment and build information

#### View Logs:

```bash
# Using CLI
doctl apps logs list <app-id>
doctl apps logs <app-id> --type=run --follow

# Using Dashboard
Dashboard > App > Runtime Logs
```

### 3. Alerts Configuration

Set up alerts in Digital Ocean App Platform:

```yaml
# In app.yaml
alerts:
  - rule: CPU_UTILIZATION
    threshold: 80
    operator: GREATER_THAN
    window: FIVE_MINUTES
  - rule: MEM_UTILIZATION
    threshold: 80
    operator: GREATER_THAN
    window: FIVE_MINUTES
  - rule: RESTART_COUNT
    threshold: 3
    operator: GREATER_THAN
    window: FIVE_MINUTES
```

## Monitoring Dashboards

### 1. Sentry Dashboard

Key widgets to monitor:

- **Error Rate**: Errors per minute/hour
- **Performance**: Transaction response times
- **Releases**: Error rates by deployment
- **User Impact**: Affected users per error

### 2. Logtail Dashboard

Create custom dashboards for:

- **Request Volume**: API usage patterns
- **Error Tracking**: Error frequency and types
- **User Activity**: Authentication and business events
- **Performance**: Response time trends

### 3. Digital Ocean Dashboard

Monitor:

- **Resource Usage**: CPU, memory, disk
- **Network Traffic**: Inbound/outbound data
- **Application Health**: Service availability
- **Cost Tracking**: Resource consumption costs

## Alerting Strategy

### 1. Critical Alerts (Immediate Response)

- **Application Down**: Health check failures
- **High Error Rate**: > 5% error rate for 5 minutes
- **Database Connectivity**: Connection failures
- **Security Incidents**: Multiple failed authentication attempts

### 2. Warning Alerts (Next Business Day)

- **High Resource Usage**: > 80% CPU/memory for 15 minutes
- **Slow Responses**: > 5 second average response time
- **Disk Space**: > 85% disk usage
- **SSL Certificate**: Expires in < 30 days

### 3. Info Alerts (Weekly Review)

- **Performance Trends**: Weekly performance summary
- **Usage Statistics**: User activity patterns
- **Cost Reports**: Resource usage and costs
- **Security Summary**: Authentication and access patterns

## Monitoring Automation

### 1. Health Check Automation

```bash
#!/bin/bash
# scripts/health-check.sh

HEALTH_URL="https://your-api-domain.com/api/v1/health"
EXPECTED_STATUS=200

response=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $response -ne $EXPECTED_STATUS ]; then
  echo "Health check failed: $response"
  # Send alert notification
  exit 1
fi

echo "Health check passed: $response"
```

### 2. Performance Monitoring

```bash
#!/bin/bash
# scripts/performance-check.sh

API_URL="https://your-api-domain.com/api/v1/health"
THRESHOLD=5000  # 5 seconds

response_time=$(curl -o /dev/null -s -w "%{time_total}" $API_URL)
response_time_ms=$(echo "$response_time * 1000" | bc)

if (( $(echo "$response_time_ms > $THRESHOLD" | bc -l) )); then
  echo "Slow response detected: ${response_time_ms}ms"
  # Send performance alert
fi
```

### 3. SSL Certificate Monitoring

```bash
#!/bin/bash
# scripts/ssl-check.sh

DOMAIN="your-domain.com"
THRESHOLD=30  # Days

expiry_date=$(echo | openssl s_client -connect $DOMAIN:443 -servername $DOMAIN 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
expiry_epoch=$(date -d "$expiry_date" +%s)
current_epoch=$(date +%s)
days_until_expiry=$(( ($expiry_epoch - $current_epoch) / 86400 ))

if [ $days_until_expiry -lt $THRESHOLD ]; then
  echo "SSL certificate expires in $days_until_expiry days"
  # Send SSL expiration alert
fi
```

## Incident Response

### 1. Escalation Procedures

1. **Automated Detection**: Monitoring systems detect issue
2. **Initial Response**: Automated remediation attempts
3. **Human Notification**: Alert sent to on-call engineer
4. **Investigation**: Log analysis and root cause identification
5. **Resolution**: Issue fix and deployment
6. **Post-Mortem**: Analysis and prevention planning

### 2. Communication Plan

- **Internal**: Slack/Teams notifications
- **External**: Status page updates
- **Stakeholders**: Email notifications for critical issues

### 3. Recovery Procedures

- **Database Backup Restore**: Automated backup restoration
- **Service Rollback**: Previous version deployment
- **Traffic Routing**: Load balancer configuration
- **Data Recovery**: Point-in-time recovery procedures

## Cost Optimization

### 1. Monitoring Costs

- **Sentry**: Monitor event volume and performance sampling
- **Logtail**: Track log volume and retention
- **Digital Ocean**: Resource usage and scaling costs

### 2. Optimization Strategies

- **Log Sampling**: Reduce log volume in production
- **Metric Aggregation**: Batch metric submissions
- **Alert Tuning**: Reduce false positive alerts
- **Resource Scaling**: Optimize container sizes

## Compliance and Security

### 1. Data Privacy

- **Log Scrubbing**: Remove PII from logs
- **Data Retention**: Implement retention policies
- **Access Control**: Restrict monitoring access

### 2. Security Monitoring

- **Failed Authentication**: Track login failures
- **Rate Limiting**: Monitor API abuse
- **Suspicious Activity**: Detect anomalous patterns
- **Security Headers**: Monitor CSP violations

### 3. Audit Trail

- **Configuration Changes**: Track monitoring updates
- **Access Logs**: Monitor who accessed what
- **Alert History**: Maintain alert history
- **Incident Records**: Document all incidents
