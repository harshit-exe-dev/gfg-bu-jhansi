// Shared MongoDB client for Vercel serverless functions.
// The connection string lives in the MONGODB_URI env var (never in code).
const { MongoClient } = require('mongodb');

let cached = globalThis.__gfgMongo;
if (!cached) {
  cached = globalThis.__gfgMongo = { client: null, promise: null };
}

async function getDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not configured');
  if (!cached.promise) {
    cached.client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
    cached.promise = cached.client.connect().then(() => cached.client.db('gfg'));
  }
  return cached.promise;
}

module.exports = { getDb };
