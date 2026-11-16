import { DynamoDBClient, ListTablesCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const globalForDb = globalThis as unknown as {
  docClient: DynamoDBDocumentClient | undefined;
};

function createDocClient() {
  const client = new DynamoDBClient({
    endpoint: process.env.DOCUMENT_API_ENDPOINT,
    region: process.env.DOCUMENT_API_REGION ?? "ru-central1",
    maxAttempts: 1,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
    },
  });

  return DynamoDBDocumentClient.from(client);
}

export const docClient = globalForDb.docClient ?? createDocClient();

if (process.env.NODE_ENV !== "production") globalForDb.docClient = docClient;

const globalForDbAvailable = globalThis as unknown as {
  _dbAvailable: boolean | null;
  _dbAvailablePromise: Promise<boolean> | null;
};

export async function isDatabaseAvailable(): Promise<boolean> {
  if (process.env.USE_DATABASE === "false") {
    return false;
  }

  // If neither a custom endpoint nor real AWS/YDB credentials are provided, skip network probe
  if (
    !process.env.DOCUMENT_API_ENDPOINT &&
    !process.env.AWS_ACCESS_KEY_ID &&
    !process.env.AWS_SECRET_ACCESS_KEY
  ) {
    return false;
  }

  if (globalForDbAvailable._dbAvailable != null) {
    return globalForDbAvailable._dbAvailable;
  }

  if (globalForDbAvailable._dbAvailablePromise) {
    return globalForDbAvailable._dbAvailablePromise;
  }

  const promise = (async () => {
    try {
      await docClient.send(
        new ListTablesCommand({}),
        { abortSignal: AbortSignal.timeout(2_500) }
      );
      globalForDbAvailable._dbAvailable = true;
      return true;
    } catch {
      console.warn(
        "DynamoDB / YDB Document API недоступен. Используется локальное файловое хранилище (.data/local-store.json)."
      );
      globalForDbAvailable._dbAvailable = false;
      return false;
    }
  })();

  globalForDbAvailable._dbAvailablePromise = promise;
  return promise;
}

export type StorageMode = "dynamodb" | "local-json" | "static-export";

export async function getStorageMode(): Promise<StorageMode> {
  if (process.env.OUTPUT_MODE === "export") {
    return "static-export";
  }

  if (await isDatabaseAvailable()) {
    return "dynamodb";
  }

  return "local-json";
}

export async function isStorageWritable(): Promise<boolean> {
  return (await getStorageMode()) !== "static-export";
}

export function resetDbAvailableCache(): void {
  globalForDbAvailable._dbAvailable = null;
  globalForDbAvailable._dbAvailablePromise = null;
}
