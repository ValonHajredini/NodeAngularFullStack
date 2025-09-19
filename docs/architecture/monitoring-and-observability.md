# Monitoring and Observability

## Monitoring Stack

- **Frontend Monitoring:** Sentry for error tracking, performance monitoring via Web Vitals
- **Backend Monitoring:** Sentry for errors, custom metrics with Prometheus
- **Error Tracking:** Sentry with source maps for detailed stack traces
- **Performance Monitoring:** New Relic APM for detailed performance insights

## Key Metrics

**Frontend Metrics:**
- Core Web Vitals (LCP, FID, CLS)
- JavaScript errors and stack traces
- API response times from client perspective
- User interactions and conversion funnel

**Backend Metrics:**
- Request rate (requests/second)
- Error rate (4xx, 5xx responses)
- Response time (p50, p95, p99)
- Database query performance
- Cache hit ratio
- Memory and CPU usage
