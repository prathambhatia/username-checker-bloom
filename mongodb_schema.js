// mongodb-setup.js
const { MongoClient } = require('mongodb');

class UsernameDatabase {
  constructor(connectionUrl, dbName = 'usernames') {
    this.connectionUrl = connectionUrl;
    this.dbName = dbName;
    this.client = null;
    this.db = null;
    this.collection = null;
  }

  async connect() {
    try {
      this.client = new MongoClient(this.connectionUrl, {
        maxPoolSize: 50,
        minPoolSize: 5,
        maxIdleTimeMS: 30000,
        serverSelectionTimeoutMS: 5000,
      });

      await this.client.connect();
      this.db = this.client.db(this.dbName);
      this.collection = this.db.collection('usernames');
      
      console.log('✅ MongoDB connected');
      await this.setupDatabase();
      
    } catch (error) {
      console.error('MongoDB connection failed:', error);
      throw error;
    }
  }

  async setupDatabase() {
    try {
      // Create indexes for optimal performance
      await this.createIndexes();
      
      // Setup sharding if needed
      await this.setupSharding();
      
      console.log('✅ MongoDB database setup completed');
      
    } catch (error) {
      console.warn('Database setup warning:', error.message);
    }
  }

  async createIndexes() {
    // Primary index on username (unique)
    await this.collection.createIndex(
      { username: 1 }, 
      { 
        unique: true,
        name: 'username_unique_idx',
        background: true
      }
    );

    // Compound index for queries with metadata
    await this.collection.createIndex(
      { username: 1, createdAt: -1 },
      { 
        name: 'username_created_idx',
        background: true
      }
    );

    // Partial index for active users (if you have status field)
    await this.collection.createIndex(
      { username: 1, status: 1 },
      { 
        name: 'username_status_idx',
        partialFilterExpression: { status: { $exists: true } },
        background: true
      }
    );

    console.log('✅ Database indexes created');
  }

  async setupSharding() {
    try {
      // Check if we're connected to a sharded cluster
      const adminDb = this.client.db('admin');
      const shardStatus = await adminDb.command({ listShards: 1 });
      
      if (shardStatus.ok === 1 && shardStatus.shards?.length > 0) {
        console.log('🔀 Setting up sharding for usernames collection...');
        
        // Enable sharding on the database
        await adminDb.command({ enableSharding: this.dbName });
        
        // Shard the collection using hashed sharding on username
        await adminDb.command({
          shardCollection: `${this.dbName}.usernames`,
          key: { username: 'hashed' }
        });
        
        console.log('✅ Sharding configured');
      }
    } catch (error) {
      // Not a sharded cluster or sharding already configured
      console.log('ℹ️  Single replica set or sharding already configured');
    }
  }

  // Check if username exists
  async isUsernameTaken(username) {
    try {
      const result = await this.collection.findOne(
        { username: username.toLowerCase() },
        { projection: { _id: 1 } } // Only return _id for existence check
      );
      return !!result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  // Register a new username
  async registerUsername(username, metadata = {}) {
    try {
      const document = {
        username: username.toLowerCase().trim(),
        originalUsername: username, // Preserve original casing
        createdAt: new Date(),
        ...metadata
      };

      const result = await this.collection.insertOne(document);
      return result.insertedId;
      
    } catch (error) {
      if (error.code === 11000) {
        throw new Error('Username already exists');
      }
      throw error;
    }
  }

  // Batch insert usernames (for seeding/migration)
  async registerUsernameBatch(usernames, batchSize = 1000) {
    const results = [];
    
    for (let i = 0; i < usernames.length; i += batchSize) {
      const batch = usernames.slice(i, i + batchSize).map(username => ({
        username: username.toLowerCase().trim(),
        originalUsername: username,
        createdAt: new Date(),
        source: 'batch_import'
      }));

      try {
        const result = await this.collection.insertMany(batch, { 
          ordered: false // Continue on duplicates
        });
        results.push(...result.insertedIds);
        
      } catch (error) {
        // Handle duplicate key errors gracefully
        if (error.code === 11000) {
          console.warn(`Batch ${i}-${i + batchSize}: Some usernames already exist`);
        } else {
          throw error;
        }
      }
    }
    
    return results;
  }

  // Get all usernames (for Bloom filter initialization)
  async getAllUsernames() {
    try {
      const cursor = this.collection.find(
        {},
        { 
          projection: { username: 1, _id: 0 },
          sort: { username: 1 }
        }
      );
      
      const usernames = [];
      await cursor.forEach(doc => {
        usernames.push(doc.username);
      });
      
      return usernames;
      
    } catch (error) {
      console.error('Error fetching usernames:', error);
      throw error;
    }
  }

  // Stream usernames for large datasets
  getUsernameStream() {
    return this.collection.find(
      {},
      { projection: { username: 1, _id: 0 } }
    ).stream();
  }

  // Get database statistics
  async getStats() {
    try {
      const stats = await this.collection.stats();
      const count = await this.collection.countDocuments();
      
      return {
        totalUsernames: count,
        collectionSize: stats.size,
        avgDocumentSize: stats.avgObjSize,
        indexCount: stats.nindexes,
        indexSize: stats.totalIndexSize,
        storageSize: stats.storageSize
      };
      
    } catch (error) {
      console.error('Error getting database stats:', error);
      return null;
    }
  }

  // Username search with pagination (for admin interfaces)
  async searchUsernames(query, options = {}) {
    const {
      page = 1,
      limit = 100,
      sortBy = 'username',
      sortOrder = 1
    } = options;

    try {
      const filter = query ? {
        username: { $regex: query, $options: 'i' }
      } : {};

      const skip = (page - 1) * limit;
      
      const [results, total] = await Promise.all([
        this.collection
          .find(filter)
          .sort({ [sortBy]: sortOrder })
          .skip(skip)
          .limit(limit)
          .toArray(),
        this.collection.countDocuments(filter)
      ]);

      return {
        results,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
      
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }

  // Delete username (for testing/admin)
  async deleteUsername(username) {
    try {
      const result = await this.collection.deleteOne({
        username: username.toLowerCase()
      });
      return result.deletedCount > 0;
      
    } catch (error) {
      console.error('Delete error:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      console.log('✅ MongoDB disconnected');
    }
  }
}

// Database seeding utility
class DatabaseSeeder {
  constructor(database) {
    this.db = database;
  }

  // Generate sample usernames for testing
  generateSampleUsernames(count = 10000) {
    const prefixes = ['user', 'player', 'gamer', 'pro', 'ninja', 'master', 'super', 'mega'];
    const suffixes = ['123', '456', '789', 'x', 'pro', 'gaming', '2024', 'official'];
    const usernames = new Set(); // Use Set to avoid duplicates

    while (usernames.size < count) {
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const number = Math.floor(Math.random() * 9999);
      const suffix = Math.random() > 0.5 ? suffixes[Math.floor(Math.random() * suffixes.length)] : '';
      
      usernames.add(`${prefix}${number}${suffix}`);
    }

    return Array.from(usernames);
  }

  // Seed database with sample data
  async seedDatabase(count = 100000) {
    console.log(`🌱 Seeding database with ${count.toLocaleString()} sample usernames...`);
    
    const startTime = Date.now();
    const usernames = this.generateSampleUsernames(count);
    
    try {
      await this.db.registerUsernameBatch(usernames);
      
      const duration = Date.now() - startTime;
      const actualCount = await this.db.collection.countDocuments();
      
      console.log(`✅ Seeded ${actualCount.toLocaleString()} usernames in ${duration}ms`);
      console.log(`📊 Average: ${(actualCount / (duration / 1000)).toFixed(0)} usernames/second`);
      
    } catch (error) {
      console.error('❌ Seeding failed:', error);
      throw error;
    }
  }

  // Import usernames from file
  async importFromFile(filePath) {
    const fs = require('fs');
    const readline = require('readline');
    
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    const usernames = [];
    for await (const line of rl) {
      const username = line.trim();
      if (username && username.length >= 3) {
        usernames.push(username);
      }
    }

    console.log(`📁 Importing ${usernames.length.toLocaleString()} usernames from file...`);
    await this.db.registerUsernameBatch(usernames);
    console.log('✅ Import completed');
  }
}

// MongoDB Schema Documentation
const SCHEMA_DOCS = {
  collection: 'usernames',
  description: 'Stores registered usernames with metadata',
  schema: {
    _id: 'ObjectId - MongoDB auto-generated ID',
    username: 'String - Normalized lowercase username (indexed, unique)',
    originalUsername: 'String - Original username with preserved casing',
    createdAt: 'Date - Registration timestamp',
    status: 'String - Optional: active, suspended, deleted',
    metadata: 'Object - Optional: Additional user data',
    source: 'String - Optional: Registration source (web, api, batch)'
  },
  indexes: [
    { fields: { username: 1 }, unique: true, name: 'username_unique_idx' },
    { fields: { username: 1, createdAt: -1 }, name: 'username_created_idx' },
    { fields: { username: 1, status: 1 }, name: 'username_status_idx', partial: true }
  ],
  sharding: {
    strategy: 'hashed',
    key: { username: 'hashed' },
    rationale: 'Even distribution across shards, good for read/write workload'
  }
};

module.exports = { 
  UsernameDatabase, 
  DatabaseSeeder, 
  SCHEMA_DOCS 
};