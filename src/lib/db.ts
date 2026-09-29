import mongoose from "mongoose";
import { getMongoUri } from "./env";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as typeof globalThis & { __mongoose?: MongooseCache };
const cache: MongooseCache = globalForMongoose.__mongoose ?? { conn: null, promise: null };
globalForMongoose.__mongoose = cache;

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;
  if (!cache.promise) {
    cache.promise = mongoose.connect(getMongoUri(), {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10_000,
    });
  }
  try {
    cache.conn = await cache.promise;
  } catch (error) {
    cache.promise = null;
    throw error;
  }
  return cache.conn;
}

export async function withTransaction<T>(fn: (session: mongoose.ClientSession) => Promise<T>): Promise<T> {
  await connectDB();
  const session = await mongoose.startSession();
  try {
    let result: T | undefined;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result as T;
  } finally {
    await session.endSession();
  }
}
