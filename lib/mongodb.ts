import mongoose from "mongoose";

/**
 * MongoDB connection string.
 * Ensure this is defined in your .env.local file.
 */
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error("Please define the MONGODB_URI environment variable.");
}

/**
 * Shape of the cached mongoose connection.
 */
interface MongooseCache {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
}

/**
 * Extend the global object so the cache persists across
 * hot reloads during development.
 */
declare global {
    // eslint-disable-next-line no-var
    var mongooseCache: MongooseCache | undefined;
}

/**
 * Reuse the cached connection if it exists.
 */
const cached: MongooseCache = global.mongooseCache ?? {
    conn: null,
    promise: null,
};

/**
 * Persist the cache on the global object.
 */
global.mongooseCache = cached;

/**
 * Establishes a connection to MongoDB.
 *
 * - Reuses an existing connection if available.
 * - Prevents multiple connections during hot reloads.
 * - Returns the active Mongoose instance.
 */
export async function connectToDatabase(): Promise<typeof mongoose> {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        cached.promise = mongoose.connect(MONGODB_URI || "", {
            bufferCommands: false,
        });
    }

    try {
        cached.conn = await cached.promise;
        return cached.conn;
    } catch (error) {
        // Reset the promise so future connection attempts can retry.
        cached.promise = null;
        throw error;
    }
}