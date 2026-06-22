import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { initDb, closeDb, getDb } from "./db";
import path from "path";
import os from "os";
import crypto from "crypto";
import fs from "fs";

let dbPath: string;

describe("Search Indexes", () => {
  beforeAll(() => {
    dbPath = path.join(os.tmpdir(), `test-search-${crypto.randomUUID()}.db`);
    initDb(dbPath);
  });

  afterAll(() => {
    closeDb();
    try { fs.unlinkSync(dbPath); } catch { /* ok */ }
  });

  it("idx_conversations_title index exists", () => {
    const row = getDb().prepare(
      "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_conversations_title'"
    ).get();
    expect(row).toBeTruthy();
  });

  it("idx_messages_conv_created index exists", () => {
    const row = getDb().prepare(
      "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_messages_conv_created'"
    ).get();
    expect(row).toBeTruthy();
  });

  it("FTS5 messages_fts virtual table still works after migration", () => {
    const row = getDb().prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='messages_fts'"
    ).get();
    expect(row).toBeTruthy();
  });
});
