import type {
  BackendAdapter,
  MessageChunk,
  Attachment,
} from "../../shared/types";
import { KeyManager } from "../security/key-manager";

export abstract class BaseHttpAdapter implements BackendAdapter {
  abstract id: string;
  abstract getDefaultModel(): string;
  abstract getBaseUrl(): string;
  abstract getApiKeyHeader(key: string): Record<string, string>;
  abstract buildRequestBody(params: {
    message: string;
    persona?: string;
    attachments?: Attachment[];
    model: string;
  }): object;
  abstract parseChunk(raw: unknown): MessageChunk | null;

  protected currentRequest: AbortController | null = null;
  protected currentModel: string | null = null;

  setModel(model: string): void {
    this.currentModel = model;
  }

  async isAvailable(): Promise<boolean> {
    return KeyManager.hasKey(this.id);
  }

  async checkAuth(): Promise<boolean> {
    const key = KeyManager.getKey(this.id);
    if (!key) return false;
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...this.getApiKeyHeader(key),
      };
      const res = await fetch(this.getBaseUrl(), {
        method: "POST",
        headers,
        body: JSON.stringify(
          this.buildRequestBody({
            message: ".",
            model: this.getDefaultModel(),
          }),
        ),
        signal: AbortSignal.timeout(10_000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    return [this.getDefaultModel()];
  }

  async *send(
    message: string,
    persona?: string,
    attachments?: Attachment[],
  ): AsyncIterable<MessageChunk> {
    const key = KeyManager.getKey(this.id);
    if (!key && this.constructor.name !== "OllamaAdapter") {
      yield {
        type: "error",
        content: `No API key configured for ${this.id}. Add one in Settings.`,
      };
      yield { type: "done", content: "" };
      return;
    }

    const model = this.currentModel ?? this.getDefaultModel();
    const body = this.buildRequestBody({
      message,
      persona,
      attachments,
      model,
    });

    const controller = new AbortController();
    this.currentRequest = controller;

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...this.getApiKeyHeader(key ?? ""),
      };

      const response = await fetch(this.getBaseUrl(), {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
        keepalive: true,
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) {
          yield { type: "error", content: "Rate limited. Wait and retry." };
        } else if (status === 401 || status === 403) {
          yield {
            type: "error",
            content: "Authentication failed. Check your API key.",
          };
        } else {
          yield {
            type: "error",
            content: `HTTP ${status}: ${response.statusText}`,
          };
        }
        yield { type: "done", content: "" };
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        yield { type: "error", content: "No response body" };
        yield { type: "done", content: "" };
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          const jsonStr = trimmed.slice(6);
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const chunk = this.parseChunk(parsed);
            if (chunk) yield chunk;
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        yield { type: "done", content: "" };
        return;
      }
      yield {
        type: "error",
        content: `Connection failed. Check your network and endpoint URL.`,
      };
    } finally {
      this.currentRequest = null;
    }

    yield { type: "done", content: "" };
  }

  abort(): void {
    this.currentRequest?.abort();
    this.currentRequest = null;
  }
}
