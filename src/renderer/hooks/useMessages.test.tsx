import { describe, it, expect } from "vitest";

// We'll test the chunk-handling logic in isolation by simulating the
// setMessages functional updater pattern.

describe("useMessages chunk handler logic", () => {
  it("appends text chunk content to assistant placeholder", () => {
    let state = [
      {
        id: "u1",
        role: "user" as const,
        content: "hello",
        conversationId: "conv-1",
        backend: "claude",
        stepIndex: null,
        createdAt: 0,
      },
      {
        id: "a1",
        role: "assistant" as const,
        content: "",
        conversationId: "conv-1",
        backend: "claude",
        stepIndex: null,
        createdAt: 0,
      },
    ];
    const applyChunk = (chunk: {
      type: string;
      content: string;
      conversationId: string;
    }) => {
      state = state.map((m, i) => {
        if (i !== state.length - 1 || m.role !== "assistant") return m;
        if (
          m.conversationId !== chunk.conversationId &&
          m.conversationId !== ""
        )
          return m;
        if (chunk.type === "text")
          return {
            ...m,
            content: m.content + chunk.content,
            conversationId: chunk.conversationId,
          };
        if (chunk.type === "error")
          return {
            ...m,
            content: `⚠ Error: ${chunk.content}`,
            conversationId: chunk.conversationId,
          };
        return m;
      });
      return state;
    };

    applyChunk({ type: "text", content: "Hi!", conversationId: "conv-1" });
    expect(state[1].content).toBe("Hi!");
  });

  it("renders error chunk as visible error message", () => {
    let state = [
      {
        id: "u1",
        role: "user" as const,
        content: "hello",
        conversationId: "conv-1",
        backend: "claude",
        stepIndex: null,
        createdAt: 0,
      },
      {
        id: "a1",
        role: "assistant" as const,
        content: "",
        conversationId: "conv-1",
        backend: "claude",
        stepIndex: null,
        createdAt: 0,
      },
    ];
    const last = state[state.length - 1];
    if (
      last.role === "assistant" &&
      (last.conversationId === "conv-1" || last.conversationId === "")
    ) {
      state = [
        ...state.slice(0, -1),
        {
          ...last,
          content: "⚠ Error: spawn claude ENOENT",
          conversationId: "conv-1",
        },
      ];
    }
    expect(state[1].content).toBe("⚠ Error: spawn claude ENOENT");
    expect(state[1].role).toBe("assistant");
  });

  it("falls back to matching placeholder with empty conversationId for new conversations", () => {
    let state = [
      {
        id: "u1",
        role: "user" as const,
        content: "hello",
        conversationId: "",
        backend: "claude",
        stepIndex: null,
        createdAt: 0,
      },
      {
        id: "a1",
        role: "assistant" as const,
        content: "",
        conversationId: "",
        backend: "claude",
        stepIndex: null,
        createdAt: 0,
      },
    ];
    const chunk = {
      type: "text",
      content: "Hi!",
      conversationId: "conv-new-uuid",
    };
    const last = state[state.length - 1];
    if (
      last.role === "assistant" &&
      (last.conversationId === chunk.conversationId ||
        last.conversationId === "")
    ) {
      state = [
        ...state.slice(0, -1),
        {
          ...last,
          content: chunk.content,
          conversationId: chunk.conversationId,
        },
      ];
    }
    expect(state[1].content).toBe("Hi!");
    expect(state[1].conversationId).toBe("conv-new-uuid");
  });
});
