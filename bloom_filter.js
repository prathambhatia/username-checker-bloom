// bloom-filter.js
const crypto = require('crypto');

class BloomFilter {
  constructor(expectedElements = 1000000, falsePositiveRate = 0.001) {
    // Calculate optimal bit array size and hash function count
    this.expectedElements = expectedElements;
    this.falsePositiveRate = falsePositiveRate;
    
    // m = -(n * ln(p)) / (ln(2)^2)
    this.bitArraySize = Math.ceil(
      -(expectedElements * Math.log(falsePositiveRate)) / Math.pow(Math.log(2), 2)
    );
    
    // k = (m / n) * ln(2)
    this.hashFunctionCount = Math.ceil(
      (this.bitArraySize / expectedElements) * Math.log(2)
    );
    
    // Use typed array for memory efficiency
    this.bitArray = new Uint8Array(Math.ceil(this.bitArraySize / 8));
    this.elementCount = 0;
    
    console.log(`BloomFilter initialized:
      - Expected elements: ${expectedElements.toLocaleString()}
      - False positive rate: ${falsePositiveRate}
      - Bit array size: ${this.bitArraySize.toLocaleString()} bits
      - Hash functions: ${this.hashFunctionCount}
      - Memory usage: ${(this.bitArray.length / 1024).toFixed(2)} KB`);
  }

  // Generate multiple hash values using double hashing
  getHashValues(item) {
    const hash1 = this.hash(item, 0);
    const hash2 = this.hash(item, hash1);
    
    const hashes = [];
    for (let i = 0; i < this.hashFunctionCount; i++) {
      const hash = (hash1 + i * hash2) % this.bitArraySize;
      hashes.push(Math.abs(hash));
    }
    return hashes;
  }

  // Simple hash function using crypto
  hash(item, seed = 0) {
    const hash = crypto.createHash('md5');
    hash.update(item + seed.toString());
    const digest = hash.digest('hex');
    return parseInt(digest.substring(0, 8), 16);
  }

  // Add item to bloom filter
  add(item) {
    const hashes = this.getHashValues(item.toLowerCase());
    
    for (const hash of hashes) {
      const byteIndex = Math.floor(hash / 8);
      const bitIndex = hash % 8;
      this.bitArray[byteIndex] |= (1 << bitIndex);
    }
    
    this.elementCount++;
  }

  // Check if item might be in the set
  mightContain(item) {
    const hashes = this.getHashValues(item.toLowerCase());
    
    for (const hash of hashes) {
      const byteIndex = Math.floor(hash / 8);
      const bitIndex = hash % 8;
      
      if ((this.bitArray[byteIndex] & (1 << bitIndex)) === 0) {
        return false; // Definitely not in set
      }
    }
    
    return true; // Might be in set (could be false positive)
  }

  // Bulk add usernames (for initialization)
  addBatch(usernames) {
    const startTime = Date.now();
    
    for (const username of usernames) {
      this.add(username);
    }
    
    const duration = Date.now() - startTime;
    console.log(`Added ${usernames.length.toLocaleString()} usernames to Bloom filter in ${duration}ms`);
  }

  // Get filter statistics
  getStats() {
    const fillRatio = this.elementCount / this.expectedElements;
    const estimatedFalsePositiveRate = Math.pow(
      1 - Math.exp(-this.hashFunctionCount * fillRatio),
      this.hashFunctionCount
    );

    return {
      elementCount: this.elementCount,
      expectedElements: this.expectedElements,
      fillRatio: fillRatio.toFixed(4),
      configuredFalsePositiveRate: this.falsePositiveRate,
      estimatedFalsePositiveRate: estimatedFalsePositiveRate.toFixed(6),
      bitArraySize: this.bitArraySize,
      hashFunctionCount: this.hashFunctionCount,
      memoryUsageKB: (this.bitArray.length / 1024).toFixed(2)
    };
  }

  // Serialize filter for persistence (optional)
  serialize() {
    return {
      bitArray: Array.from(this.bitArray),
      elementCount: this.elementCount,
      bitArraySize: this.bitArraySize,
      hashFunctionCount: this.hashFunctionCount,
      expectedElements: this.expectedElements,
      falsePositiveRate: this.falsePositiveRate
    };
  }

  // Deserialize filter from persistence (optional)
  static deserialize(data) {
    const filter = new BloomFilter(data.expectedElements, data.falsePositiveRate);
    filter.bitArray = new Uint8Array(data.bitArray);
    filter.elementCount = data.elementCount;
    filter.bitArraySize = data.bitArraySize;
    filter.hashFunctionCount = data.hashFunctionCount;
    return filter;
  }
}

module.exports = BloomFilter;