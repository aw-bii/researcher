import { describe, it, expect } from "vitest";
import type { SecurityEvent, WriteApprovalRequest } from "./types";

describe("SecurityEvent types", () => {
  it("SecurityEvent discriminates on type", () => {
    const injection: SecurityEvent = {
      type: "injection_detected",
      severity: "high",
      message: "Potential prompt injection detected",
      detail: 'Found pattern: "ignore all previous instructions"',
      source: "claude",
    };
    const approval: SecurityEvent = {
      type: "write_approval_needed",
      filePath: "/etc/passwd",
      content: "root:x:0:0:root:/root:/bin/bash",
      source: "opencode",
      severity: "high",
      message: "File write requires approval",
    };
    expect(injection.type).toBe("injection_detected");
    expect(approval.type).toBe("write_approval_needed");
  });

  it("WriteApprovalRequest carries file path and content", () => {
    const req: WriteApprovalRequest = {
      filePath: "/tmp/test.txt",
      content: "hello",
    };
    expect(req.filePath).toBe("/tmp/test.txt");
  });
});
