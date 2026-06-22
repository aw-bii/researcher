import { describe, it, expect, vi, beforeEach } from "vitest";
import { WriteApproval } from "./write-approval";

describe("WriteApproval", () => {
  beforeEach(() => {
    WriteApproval.reset();
  });

  describe("queue and respond", () => {
    it("queues a pending request and returns an id", () => {
      const id = WriteApproval.queue("/tmp/test.txt", "hello world");
      expect(id).toBeTruthy();
      expect(typeof id).toBe("string");
    });

    it("resolves queued request on approval", async () => {
      const id = WriteApproval.queue("/tmp/test.txt", "hello");
      const promise = WriteApproval.waitFor(id);
      WriteApproval.respond(id, true);
      const result = await promise;
      expect(result.approved).toBe(true);
      expect(result.filePath).toBe("/tmp/test.txt");
    });

    it("rejects queued request on denial", async () => {
      const id = WriteApproval.queue("/tmp/test.txt", "hello");
      const promise = WriteApproval.waitFor(id);
      WriteApproval.respond(id, false);
      const result = await promise;
      expect(result.approved).toBe(false);
    });

    it("times out after configured duration", async () => {
      const id = WriteApproval.queue("/tmp/test.txt", "hello", 50);
      const result = await WriteApproval.waitFor(id);
      expect(result.approved).toBe(false);
      expect(result.reason).toBe("timeout");
    }, 100);

    it("returns pending count", () => {
      WriteApproval.queue("/tmp/a", "1");
      WriteApproval.queue("/tmp/b", "2");
      expect(WriteApproval.pendingCount()).toBe(2);
    });
  });
});
