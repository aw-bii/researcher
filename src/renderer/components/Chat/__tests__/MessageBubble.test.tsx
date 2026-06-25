import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageBubble } from "../MessageBubble";
import type { Message } from "../../../../shared/types";

vi.mock("react-markdown", () => ({
  default: ({ children }: any) => <div data-testid="markdown">{children}</div>,
}));

vi.mock("../../ipc", () => ({
  listAttachments: vi.fn().mockResolvedValue([]),
}));

describe("MessageBubble", () => {
  const userMsg: Message = {
    id: "1",
    conversationId: "c1",
    role: "user",
    content: "Hello",
    backend: "claude",
    stepIndex: null,
    createdAt: Date.now(),
  };
  const assistantMsg: Message = {
    id: "2",
    conversationId: "c1",
    role: "assistant",
    content: "Hi there",
    backend: "claude",
    stepIndex: null,
    createdAt: Date.now(),
  };

  it("renders user message content", () => {
    const { container } = render(<MessageBubble message={userMsg} />);
    expect(container.textContent).toContain("Hello");
  });

  it("renders assistant message content", () => {
    render(<MessageBubble message={assistantMsg} />);
    expect(screen.getByTestId("markdown")).toBeTruthy();
  });

  it("shows backend and timestamp", () => {
    const { container } = render(<MessageBubble message={userMsg} />);
    expect(container.textContent).toContain("claude");
  });

  it("renders user message timestamp without opacity-50 class", () => {
    const { container } = render(<MessageBubble message={userMsg} />);
    const timestampEl = container.querySelector(".text-xs.mt-1");
    expect(timestampEl).not.toHaveClass("opacity-50");
    expect(timestampEl).toHaveClass("text-blue-100");
  });
});

describe("MessageBubble accessibility", () => {
  const userMsg: Message = {
    id: "m1",
    role: "user",
    content: "Hello",
    conversationId: "c1",
    backend: "claude",
    stepIndex: null,
    createdAt: 1719313200000, // 2026-06-25T10:00:00.000Z
  };

  const assistantMsg: Message = {
    id: "m2",
    role: "assistant",
    content: "Hi there",
    conversationId: "c1",
    backend: "claude",
    stepIndex: null,
    createdAt: 1719313200000, // 2026-06-25T10:00:00.000Z
  };

  it("user bubble has aria-label identifying sender", () => {
    render(<MessageBubble message={userMsg} />);
    expect(screen.getByRole("article", { name: /your message/i })).toBeTruthy();
  });

  it("assistant bubble has aria-label identifying sender", () => {
    render(<MessageBubble message={assistantMsg} />);
    expect(screen.getByRole("article", { name: /assistant message/i })).toBeTruthy();
  });

  it("timestamp uses <time> element with datetime attribute", () => {
    const { container } = render(<MessageBubble message={userMsg} />);
    const timeEl = container.querySelector("time");
    expect(timeEl).not.toBeNull();
    expect(timeEl?.getAttribute("dateTime")).toBe(
      new Date(userMsg.createdAt).toISOString()
    );
  });
});
