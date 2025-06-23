# Username Availability Service

A high-performance username availability checking service using a multi-layered caching architecture inspired by Google's approach.

## System Architecture

```
API Gateway/Express.js
       ↓
   Bloom Filter (in-memory)
       ↓
   Redis Cache Cluster
       ↓
MongoDB Sharded Cluster (Source of Truth)
```

### Components:

1. **Bloom Filter Layer**: O(1) probabilistic checks for "definitely not available"
2. **Redis Cache**: Hot username lookups with TTL
3. **MongoDB**: Persistent storage with username sharding
4. **Express.js API**: Orchestrates the multi-layer lookup flow

## Trade-offs & Design Decisions

### Bloom Filter
- **Pro**: Ultra-fast O(1) lookups, memory efficient
- **Con**: False positives possible (configurable ~0.1%)
- **Impact**: May occasionally check cache/DB for available usernames

### Redis Cache
- **Pro**: Sub-millisecond lookups for hot usernames
- **Con**: Additional infrastructure complexity
- **Strategy**: TTL of 1 hour, write-through on registration

### MongoDB Sharding
- **Pro**: Horizontal scaling, consistent reads
- **Con**: Cross-shard queries complexity
- **Strategy**: Hash-based sharding on username

## Performance Targets
- **Latency**: < 5ms per lookup (99th percentile)
- **Throughput**: 10,000+ RPS per instance
- **Cache Hit Rate**: > 80% for popular username checks

## Quick Start

### Prerequisites
```bash
# Install dependencies
npm install

# Start infrastructure
docker-compose up -d redis mongodb

# Initialize database
npm run db:init
```

### Running the Service
```bash
# Development
npm run dev

# Production
npm start
```

### API Usage
```bash
# Check username availability
curl http://localhost:3000/username/johndoe

# Response format
{
  "username": "johndoe",
  "available": false,
  "source": "bloom_filter", // bloom_filter | cache | database
  "response_time_ms": 0.5
}
```

## Load Testing

### Using k6
```bash
# Install k6
brew install k6  # macOS
# or download from https://k6.io/

# Run load test
k6 run loadtest.js

# Expected results:
# - 95% < 5ms response time
# - Cache hit rate > 80%
# - Bloom filter efficiency > 99%
```

### Using Apache Bench
```bash
# Simple load test
ab -n 10000 -c 100 http://localhost:3000/username/testuser123

# Monitor cache hit ratios in application logs
```

## Monitoring & Metrics

The service exposes metrics at `/metrics`:
- `bloom_filter_hits`: Bloom filter positive checks
- `cache_hits`: Redis cache hits
- `database_queries`: Fallback database queries
- `response_times`: Histogram of response times

## Deployment Considerations

### Scaling
- **Horizontal**: Load balance multiple API instances
- **Vertical**: Increase Bloom filter size for lower false positive rate
- **Database**: Add MongoDB shards as user base grows

### Production Checklist
- [ ] Configure MongoDB replica sets
- [ ] Set up Redis clustering/sentinel
- [ ] Monitor Bloom filter false positive rate
- [ ] Implement circuit breakers for database fallback
- [ ] Set up proper logging and alerting

## Configuration

Environment variables:
```bash
PORT=3000
REDIS_URL=redis://localhost:6379
MONGODB_URL=mongodb://localhost:27017/usernames
BLOOM_FILTER_SIZE=1000000
BLOOM_FILTER_HASH_FUNCTIONS=7
CACHE_TTL_SECONDS=3600
```