// server.js
const express = require('express');
const cors = require('cors'); 
const { MongoClient } = require('mongodb');
const BloomFilter = require('./bloom_filter');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configuration
const config = {
  port: process.env.PORT || 3000,
  mongoUrl: 'mongodb+srv://prathambhatia741:salmanlodu@pratham.pxztvxm.mongodb.net/?retryWrites=true&w=majority',
  bloomFilterSize: parseInt(process.env.BLOOM_FILTER_SIZE) || 1000000,
  bloomFilterFPR: parseFloat(process.env.BLOOM_FILTER_FPR) || 0.001
};

// Global instances
let mongoClient;
let db;
let usernamesCollection;
let bloomFilter;

// Metrics
const metrics = {
  bloomFilterHits: 0,
  databaseQueries: 0,
  totalRequests: 0,
  responseTimes: []
};

// Initialize services
async function initializeServices() {
  try {
    mongoClient = new MongoClient(config.mongoUrl);
    await mongoClient.connect();
    db = mongoClient.db();
    usernamesCollection = db.collection('usernames');
    await usernamesCollection.createIndex({ username: 1 }, { unique: true });
    console.log('✅ MongoDB connected');

    bloomFilter = new BloomFilter(config.bloomFilterSize, config.bloomFilterFPR);
    await initializeBloomFilter();
    console.log('✅ Bloom Filter initialized');

  } catch (error) {
    console.error('❌ Service initialization failed:', error);
    process.exit(1);
  }
}

async function initializeBloomFilter() {
  const startTime = Date.now();
  try {
    const cursor = usernamesCollection.find({}, { projection: { username: 1 } });
    let count = 0;
    const batchSize = 1000;
    let batch = [];

    await cursor.forEach((doc) => {
      batch.push(doc.username);
      count++;
      if (batch.length >= batchSize) {
        bloomFilter.addBatch(batch);
        batch = [];
      }
    });

    if (batch.length > 0) bloomFilter.addBatch(batch);

    const duration = Date.now() - startTime;
    console.log(`Loaded ${count.toLocaleString()} usernames into Bloom filter in ${duration}ms`);
  } catch (error) {
    console.error('Failed to initialize Bloom filter:', error);
  }
}

// Username availability check
app.get('/username/:name', async (req, res) => {
  const startTime = Date.now();
  const username = req.params.name.toLowerCase().trim();
  const forceDb = req.query.force_db === 'true'; // 👈 key line

  if (!isValidUsername(username)) {
    return res.status(400).json({ error: 'Invalid username format', username });
  }

  try {
    metrics.totalRequests++;

    // ✅ Skip Bloom filter if forced
    if (!forceDb && !bloomFilter.mightContain(username)) {
      metrics.bloomFilterHits++;
      const responseTime = Date.now() - startTime;
      metrics.responseTimes.push(responseTime);

      return res.json({
        username,
        available: true,
        source: 'bloom_filter',
        response_time_ms: responseTime
      });
    }

    // 🔍 Always hit DB in this path
    metrics.databaseQueries++;
    const existingUser = await usernamesCollection.findOne({ username });
    const available = !existingUser;

    const responseTime = Date.now() - startTime;
    metrics.responseTimes.push(responseTime);

    res.json({
      username,
      available,
      source: forceDb ? 'forced_database' : 'database',
      response_time_ms: responseTime
    });

  } catch (error) {
    console.error('Username check error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});


// Username registration
app.post('/username', async (req, res) => {
  try {
    console.log('🟡 Incoming body:', req.body); // 1

    const { username } = req.body;
    if (!username) {
      console.log('🔴 No username in request!');
      return res.status(400).json({ error: 'Username is required' });
    }

    const normalizedUsername = username.toLowerCase().trim();
    if (!isValidUsername(normalizedUsername)) {
      console.log('🔴 Invalid format:', normalizedUsername);
      return res.status(400).json({ error: 'Invalid username format' });
    }

    const existingUser = await usernamesCollection.findOne({ username: normalizedUsername });
    if (existingUser) {
      console.log('🟥 Username taken:', normalizedUsername);
      return res.status(409).json({ error: 'Username already taken', username: normalizedUsername });
    }

    const result = await usernamesCollection.insertOne({
      username: normalizedUsername,
      createdAt: new Date()
    });

    console.log('✅ Inserted into DB:', result.insertedId); // 2

    try {
      bloomFilter.add(normalizedUsername);
    } catch (bloomError) {
      console.warn('⚠️ Bloom filter error:', bloomError.message);
    }

    res.status(201).json({
      message: 'Username registered successfully',
      username: normalizedUsername
    });

    console.log('🟢 Registration success sent'); // 3

  } catch (err) {
    console.error('🔥 Caught in outer catch:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message,
      stack: err.stack
    });
  }
});

// Health check
app.get('/health', async (req, res) => {
  try {
    await db.admin().ping();
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        mongodb: 'connected',
        bloom_filter: 'active'
      }
    });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

// Metrics
app.get('/metrics', (req, res) => {
  const stats = bloomFilter.getStats();
  const avgResponseTime = metrics.responseTimes.length > 0
    ? metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length
    : 0;

  res.json({
    bloom_filter: {
      hits: metrics.bloomFilterHits,
      hit_rate: metrics.totalRequests > 0 ? (metrics.bloomFilterHits / metrics.totalRequests * 100).toFixed(2) + '%' : '0%',
      stats
    },
    database: {
      queries: metrics.databaseQueries,
      fallback_rate: metrics.totalRequests > 0 ? (metrics.databaseQueries / metrics.totalRequests * 100).toFixed(2) + '%' : '0%'
    },
    performance: {
      total_requests: metrics.totalRequests,
      avg_response_time_ms: avgResponseTime.toFixed(2),
      p95_response_time_ms: getPercentile(metrics.responseTimes, 0.95).toFixed(2),
      p99_response_time_ms: getPercentile(metrics.responseTimes, 0.99).toFixed(2),
      response_times: metrics.responseTimes
    }
  });
});

// Utils
function isValidUsername(username) {
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

function getPercentile(arr, percentile) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * percentile) - 1;
  return sorted[Math.max(0, index)];
}

// Shutdown handler
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  try {
    await mongoClient.close();
    console.log('✅ Services closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

// Start server
async function startServer() {
  await initializeServices();
  app.listen(config.port, () => {
    console.log(`🚀 Username availability service running on port ${config.port}`);
    console.log(`📊 Metrics available at http://localhost:${config.port}/metrics`);
    console.log(`🏥 Health check at http://localhost:${config.port}/health`);
  });
}

if (require.main === module) {
  startServer().catch(console.error);
}

module.exports = app;
