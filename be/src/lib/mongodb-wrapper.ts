import { MongoClient, Db, Collection, Document } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

interface IDatabase {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getDb(): Promise<Db>;
}

class Database implements IDatabase {
  private static instance: Database;
  client: MongoClient;
  private db: Db | null = null;
  private is_connected: boolean = false;

  private constructor() {
    this.client = new MongoClient(process.env.MONGODB_URI!, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 100,
      retryWrites: true,
      w: "majority",
    });

    this.client.on("open", () => {
      this.is_connected = true;
    });

    this.client.on("close", () => {
      this.is_connected = false;
    });
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }

    return Database.instance;
  }

  public async connect(): Promise<void> {
    if (this.is_connected) return;

    try {
      await this.client.connect();

      this.db = this.client.db();

      this.is_connected = true;
    } catch (error) {
      this.is_connected = false;

      console.error("Failed to connect to MongoDB:", error);

      setTimeout(() => this.connect(), 4000);
    }
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();

      this.is_connected = false;

      console.log("Disconnected from MongoDB");
    }
  }

  public async getDb(): Promise<Db> {
    if (!this.db) {
      await this.connect();
    }

    return this.db!;
  }
}

interface ICollectionManager<T extends Document> {
  getCollection(): Promise<Collection<T>>;
}

class CollectionManager<T extends Document> implements ICollectionManager<T> {
  collection_name: string;
  private database: IDatabase;

  constructor(collection_name: string) {
    this.collection_name = collection_name;
    this.database = Database.getInstance();
  }

  public async getCollection(): Promise<Collection<T>> {
    const db = await this.database.getDb();
    return db.collection<T>(this.collection_name);
  }
}

export { Database, CollectionManager };
