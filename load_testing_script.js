// loadtest.js - k6 Load Testing Script
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const bloomFilterHits = new Rate('bloom_filter_hit_rate');
const cacheHits = new Rate('cache_hit_rate'); 
const databaseFallbacks = new Rate('database_fallback_rate');
const responseTime = new Trend('response_time_custom');
const errorRate = new Rate('errors');
const totalRequests = new Counter('total_requests');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 100 }, // Stay at 100 users for 5 minutes
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 200 }, // Stay at 200 users for 5 minutes
    { duration: '2m', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<5'], // 95% of requests must be below 5ms
    http_req_failed: ['rate<0.1'],  // Error rate should be less than 10%
    response_time_custom: ['p(99)<10'], // 99% under 10ms
  },
};

// Test data - mix of available and taken usernames
const testUsernames = [
  // Likely available (random combinations)
  'user_' + Math.random().toString(36).substr(2, 9),
  'test_' + Math.random().toString(36).substr(2, 9),
  'player_' + Math.random().toString(36).substr(2, 9),
  
  // Likely taken (common patterns)
  'admin', 'user', 'test', 'player1', 'user123', 'admin123',
  'john', 'mike', 'sarah', 'alex', 'chris', 'lisa',
  
  // Mixed patterns
  'gamer2024', 'ninja_pro', 'master_chief', 'super_user',
  'player_one', 'user_ultimate', 'pro_gamer'
];

export default function () {
  // Select random username for testing
  const username = testUsernames[Math.floor(Math.random() * testUsernames.length)];
  
  const startTime = Date.now();
  const response = http.get(`http://localhost:3000/username/${username}`);
  const endTime = Date.now();
  
  totalRequests.add(1);
  responseTime.add(endTime - startTime);
  
  // Check response
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 5ms': () => (endTime - startTime) < 5,
    'has username field': (r) => JSON.parse(r.body).username !== undefined,
    'has available field': (r) => JSON.parse(r.body).available !== undefined,
    'has source field': (r) => JSON.parse(r.body).source !== undefined,
  });
  
  if (!success) {
    errorRate.add(1);
  }
  
  // Track cache layer performance
  if (response.status === 200) {
    const body = JSON.parse(response.body);
    
    switch (body.source) {
      case 'bloom_filter':
        bloomFilterHits.add(1);
        break;
      case 'cache':
        cacheHits.add(1);
        break;
      case 'database':
        databaseFallbacks.add(1);
        break;
    }
  }
  
  // Random think time between requests
  sleep(Math.random() * 0.1); // 0-100ms
}

// Teardown function to collect final metrics
export function teardown() {
  const metricsResponse = http.get('http://localhost:3000/metrics');
  
  if (metricsResponse.status === 200) {
    console.log('=== FINAL METRICS ===');
    console.log(metricsResponse.body);
  }
}