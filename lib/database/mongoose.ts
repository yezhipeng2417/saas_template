import mongoose, { Mongoose } from 'mongoose';

const MONGODB_URL = process.env.MONGODB_URL;

interface MongooseConnection {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

let cached = (global as any).mongoose || { conn: null, promise: null };

export const connectToDatabase = async () => {
  if (cached.conn) return cached.conn;

  if (!process.env.MONGODB_URL) throw new Error('MONGODB_URL is missing');

  cached.promise = cached.promise || mongoose.connect(process.env.MONGODB_URL, {
    dbName: 'imaginify',
    bufferCommands: false,
  });

  try {
    console.log('Connecting to MongoDB...');
    cached.conn = await cached.promise;
    console.log('Successfully connected to MongoDB!');
  } catch (e) {
    console.error('Error connecting to MongoDB:', e);
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}