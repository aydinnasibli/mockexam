import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not defined');
}

declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
}

let cached = global._mongooseCache;

if (!cached) {
  cached = global._mongooseCache = { conn: null, promise: null };
}

let indexesCleaned = false;

async function dropStaleIndexes() {
  if (indexesCleaned) return;
  indexesCleaned = true;
  try {
    const col = mongoose.connection.collection('purchases');
    const indexes = await col.indexes();
    if (indexes.some(i => i.name === 'transactionId_1')) {
      await col.dropIndex('transactionId_1');
    }
  } catch {
    // Collection may not exist yet — safe to ignore
  }
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then(async (mongoose) => {
      await dropStaleIndexes();
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
