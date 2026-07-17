import path from "path";
import { getEnv } from "@/lib/env";
import type { ObjectStorage } from "./types";
import { LocalDiskStorage } from "./local";
import { S3Storage } from "./s3";

export type { ObjectStorage } from "./types";
export { contentTypeFor } from "./types";

const globalForStorage = globalThis as unknown as { storage?: ObjectStorage };

export function getStorage(): ObjectStorage {
  if (!globalForStorage.storage) {
    const env = getEnv();
    if (env.STORAGE_DRIVER === "s3") {
      globalForStorage.storage = new S3Storage({
        endpoint: env.S3_ENDPOINT || undefined,
        region: env.S3_REGION,
        bucket: env.S3_BUCKET,
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      });
    } else {
      globalForStorage.storage = new LocalDiskStorage(
        path.resolve(process.cwd(), env.LOCAL_STORAGE_DIR),
      );
    }
  }
  return globalForStorage.storage;
}
