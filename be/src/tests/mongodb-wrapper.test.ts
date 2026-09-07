let mockEventHandlers: { [event: string]: Function } = {};
let mockCollection: any;
let mockDb: any;
let mockMongoClientInstance: any;

jest.mock("mongodb", () => {
  return {
    MongoClient: jest.fn().mockImplementation(() => {
      return mockMongoClientInstance;
    }),
    Db: jest.fn(),
    Collection: jest.fn(),
  };
});

import { Database, CollectionManager } from "../lib/mongodb-wrapper";

describe("MongoDB Wrapper Unit Tests (src/lib/mongodb-wrapper.ts)", () => {
  beforeAll(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});
    mockEventHandlers = {};
    mockCollection = {
      find: jest.fn(),
      findOne: jest.fn(),
    };
    mockDb = {
      collection: jest.fn().mockReturnValue(mockCollection),
    };
    mockMongoClientInstance = {
      on: jest.fn((event: string, cb: Function) => {
        mockEventHandlers[event] = cb;
      }),
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      db: jest.fn().mockReturnValue(mockDb),
    };
    // Reset singleton instance before each test
    (Database as any).instance = undefined;
  });

  describe("Database Singleton & Event Listeners", () => {
    it("should instantiate a new Database if none exists, and return existing instance on second call", () => {
      const db1 = Database.getInstance();
      expect(db1).toBeDefined();

      const db2 = Database.getInstance();
      expect(db2).toBe(db1);
    });

    it("should handle 'open' and 'close' client events", () => {
      const db = Database.getInstance();

      expect(mockEventHandlers["open"]).toBeDefined();
      expect(mockEventHandlers["close"]).toBeDefined();

      // Trigger open event
      mockEventHandlers["open"]();
      expect((db as any).is_connected).toBe(true);

      // Trigger close event
      mockEventHandlers["close"]();
      expect((db as any).is_connected).toBe(false);
    });
  });

  describe("Database.connect()", () => {
    it("should not reconnect if already connected", async () => {
      const db = Database.getInstance();
      (db as any).is_connected = true;

      await db.connect();

      expect(mockMongoClientInstance.connect).not.toHaveBeenCalled();
    });

    it("should connect successfully and set db and is_connected to true", async () => {
      const db = Database.getInstance();
      (db as any).is_connected = false;

      await db.connect();

      expect(mockMongoClientInstance.connect).toHaveBeenCalled();
      expect(mockMongoClientInstance.db).toHaveBeenCalled();
      expect((db as any).is_connected).toBe(true);
      expect((db as any).db).toBe(mockDb);
    });

    it("should handle connect failure, log error, and schedule retry with setTimeout", async () => {
      jest.useFakeTimers();

      const db = Database.getInstance();
      (db as any).is_connected = false;

      const connectError = new Error("Connection timed out");
      mockMongoClientInstance.connect.mockRejectedValueOnce(connectError);

      const connectSpy = jest.spyOn(db, "connect");

      await db.connect();

      expect((db as any).is_connected).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        "Failed to connect to MongoDB:",
        connectError
      );

      // Advance timers to trigger retry setTimeout callback
      mockMongoClientInstance.connect.mockResolvedValueOnce(undefined);
      jest.advanceTimersByTime(4000);

      expect(connectSpy).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });
  });

  describe("Database.disconnect()", () => {
    it("should close client and set is_connected to false when client exists", async () => {
      const db = Database.getInstance();
      (db as any).is_connected = true;

      await db.disconnect();

      expect(mockMongoClientInstance.close).toHaveBeenCalled();
      expect((db as any).is_connected).toBe(false);
      expect(console.log).toHaveBeenCalledWith("Disconnected from MongoDB");
    });

    it("should handle disconnect safely when client is not defined", async () => {
      const db = Database.getInstance();
      (db as any).client = null;

      await db.disconnect();

      expect(mockMongoClientInstance.close).not.toHaveBeenCalled();
    });
  });

  describe("Database.getDb()", () => {
    it("should call connect if db is null, and return db", async () => {
      const db = Database.getInstance();
      (db as any).db = null;

      const connectSpy = jest.spyOn(db, "connect");

      const result = await db.getDb();

      expect(connectSpy).toHaveBeenCalled();
      expect(result).toBe(mockDb);
    });

    it("should return existing db directly without calling connect if db is already initialized", async () => {
      const db = Database.getInstance();
      (db as any).db = mockDb;

      const connectSpy = jest.spyOn(db, "connect");

      const result = await db.getDb();

      expect(connectSpy).not.toHaveBeenCalled();
      expect(result).toBe(mockDb);
    });
  });

  describe("CollectionManager", () => {
    it("should initialize with collection name and retrieve collection via database", async () => {
      const db = Database.getInstance();
      (db as any).db = mockDb;

      const manager = new CollectionManager("test_collection");
      expect(manager.collection_name).toBe("test_collection");

      const col = await manager.getCollection();

      expect(mockDb.collection).toHaveBeenCalledWith("test_collection");
      expect(col).toBe(mockCollection);
    });
  });
});
