import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockSearch } = vi.hoisted(() => ({
  mockSearch: vi.fn().mockResolvedValue([]),
}));

vi.mock("../../hooks/useConversations", () => ({
  useConversations: () => ({ conversations: [], search: mockSearch }),
}));

import { ConvList } from "./ConvList";

describe("ConvList search debounce", () => {
  beforeEach(() => { vi.useFakeTimers(); mockSearch.mockClear(); });
  afterEach(() => { vi.useRealTimers(); });

  it("calls search once after 300ms pause, not on every keystroke", async () => {
    render(
      <ConvList
        activeId={null} onSelect={vi.fn()} onDelete={vi.fn()} onRename={vi.fn()}
      />,
    );
    const input = screen.getByRole("textbox");

    fireEvent.change(input, { target: { value: "a" } });
    fireEvent.change(input, { target: { value: "ab" } });
    fireEvent.change(input, { target: { value: "abc" } });

    // Not called yet — still within debounce window
    expect(mockSearch).not.toHaveBeenCalled();

    await act(async () => { vi.advanceTimersByTime(350); });

    // Called exactly once with final value
    expect(mockSearch).toHaveBeenCalledTimes(1);
    expect(mockSearch).toHaveBeenCalledWith("abc");
  });
});
