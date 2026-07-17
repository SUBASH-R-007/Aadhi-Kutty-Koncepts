import { promises as fs } from "fs";
import path from "path";
import type { ObjectStorage } from "./types";

/**
 * Development storage driver: writes under LOCAL_STORAGE_DIR and serves files
 * through the /api/assets/[...key] route. Keys are sanitized to stay inside
 * the storage root.
 */
export class LocalDiskStorage implements ObjectStorage {
  constructor(private rootDir: string) {}

  private resolve(key: string): string {
    const safe = path
      .normalize(key)
      .replace(/^(\.\.(\/|\\|$))+/, "")
      .replace(/^[/\\]+/, "");
    const full = path.resolve(this.rootDir, safe);
    if (!full.startsWith(path.resolve(this.rootDir))) {
      throw new Error(`Invalid storage key: ${key}`);
    }
    return full;
  }

  async put(key: string, data: Buffer): Promise<void> {
    const file = this.resolve(key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, data);
  }

  async get(key: string): Promise<Buffer> {
    return fs.readFile(this.resolve(key));
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.resolve(key));
      return true;
    } catch {
      return false;
    }
  }

  async delete(key: string): Promise<void> {
    await fs.rm(this.resolve(key), { force: true });
  }

  publicUrl(key: string): string {
    return `/api/assets/${key.split("/").map(encodeURIComponent).join("/")}`;
  }
}
