import { MongoClient, Db } from 'mongodb';

let mongoClient: MongoClient | null = null;
let dbInstance: Db | null = null;
let isConnected = false;

export async function initializeBetterAuthDB() {
  if (!isConnected) {
    const uri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB_NAME;

    if (!uri) {
      throw new Error('Environment variable MONGODB_URI is not defined');
    }

    mongoClient = new MongoClient(uri);
    await mongoClient.connect();
    dbInstance = mongoClient.db(dbName);
    isConnected = true;
    console.log('Better Auth MongoDB: Connected');
  }

  return dbInstance!;
}

// Getter for the client
export function getDbClient(): Db {
  if (!dbInstance) {
    throw new Error(
      'Database not initialized. Call initializeBetterAuthDB() first.',
    );
  }
  return dbInstance;
}

// Graceful shutdown
// eslint-disable-next-line @typescript-eslint/no-misused-promises
process.on('SIGINT', async () => {
  if (mongoClient) {
    await mongoClient.close();
  }
  process.exit(0);
});

// eslint-disable-next-line @typescript-eslint/no-misused-promises
process.on('SIGTERM', async () => {
  if (mongoClient) {
    await mongoClient.close();
  }
  process.exit(0);
});
