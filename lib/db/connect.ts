import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is not set");
}

// Cached across hot reloads / serverless invocations so we don't open a new
// connection on every request.
let cached = (global as typeof globalThis & { _mongoose?: Promise<typeof mongoose> })
  ._mongoose;

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (!cached) {
    cached = mongoose.connect(MONGODB_URI as string);
    (global as typeof globalThis & { _mongoose?: Promise<typeof mongoose> })._mongoose =
      cached;
  }
  return cached;
}
