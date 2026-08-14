// Holds MONGODB_URI; a client-side import must fail the build, not ship the driver.
import 'server-only';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not defined');
}

declare global {
  var _mongooseCache: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
}

let cached = global._mongooseCache;

if (!cached) {
  cached = global._mongooseCache = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      // Serverless-tuned. Each instance keeps its own pool, and instances scale
      // out independently, so the driver default of 100 would let a traffic
      // spike exhaust the cluster's connection limit. 10 is ample per instance
      // because a request holds a connection only for the duration of a query.
      maxPoolSize: 10,
      // Close idle sockets so scaled-down instances release their connections.
      maxIdleTimeMS: 60_000,
      // Fail fast instead of hanging the request for the 30s default when the
      // cluster is unreachable — the caller can render an error far sooner.
      serverSelectionTimeoutMS: 10_000,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts);
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
