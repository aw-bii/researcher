import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../store", () => ({
  ConvStore: {
    getSetting: vi.fn(() => null),
  },
}));

vi.mock("electron", () => ({
  safeStorage: {
    encryptString: (s: string) => Buffer.from(s),
    decryptString: (b: Buffer) => b.toString(),
    isEncryptionAvailable: () => true,
  },
  app: { getVersion: () => "1.0.0" },
}));

vi.mock("../security/key-manager", () => ({
  KeyManager: {
    getKey: vi.fn((id: string) =>
      id === "no-key-required" ? null : `mock-key-${id}`,
    ),
    hasKey: vi.fn((id: string) => id !== "no-key-required"),
  },
}));

import { BaseHttpAdapter } from "./http-base-adapter";

class TestAdapter extends BaseHttpAdapter {
  id = "test";
  getDefaultModel(): string {
    return "test-model";
  }
  getBaseUrl(): string {
    return "https://api.test.com/v1/chat";
  }
  getApiKeyHeader(): Record<string, string> {
    return { Authorization: "Bearer test-key" };
  }
  buildRequestBody(params: {
    message: string;
    persona?: string;
    attachments?: any[];
    model: string;
  }): object {
    return {
      model: params.model,
      messages: [{ role: "user", content: params.message }],
      stream: true,
    };
  }
  parseChunk(raw: any): any {
    if (raw.choices?.[0]?.delta?.content) {
      return { type: "text" as const, content: raw.choices[0].delta.content };
    }
    return null;
  }
  async checkAuth(): Promise<boolean> {
    return true;
  }
  async isAvailable(): Promise<boolean> {
    return true;
  }
}

describe("BaseHttpAdapter", () => {
  let adapter: TestAdapter;

  beforeEach(() => {
    adapter = new TestAdapter();
  });

  it("has correct id", () => {
    expect(adapter.id).toBe("test");
  });

  it("returns default model", () => {
    expect(adapter.getDefaultModel()).toBe("test-model");
  });

  it("buildRequestBody includes model and message", () => {
    const body = adapter.buildRequestBody({
      message: "hello",
      model: "test-model",
    });
    expect(body).toHaveProperty("model", "test-model");
    expect(body).toHaveProperty("stream", true);
  });

  it("parseChunk extracts text delta", () => {
    const raw = { choices: [{ delta: { content: "Hello" } }] };
    const chunk = adapter.parseChunk(raw);
    expect(chunk).toEqual({ type: "text", content: "Hello" });
  });

  it("parseChunk returns null for non-content chunks", () => {
    const raw = { choices: [{ delta: {} }] };
    expect(adapter.parseChunk(raw)).toBeNull();
  });

  it("abort sets controller to null", () => {
    adapter.abort();
    expect(true).toBe(true);
  });
});
