import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConvItem } from "../ConvItem";
import type { Conversation } from "../../../../shared/types";

describe("ConvItem", () => {
  const conv: Conversation = {
    id: "c1",
    title: "Test Conversation",
    backend: "claude",
    personaId: null,
    pipelineTemplateId: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  it("renders conversation title", () => {
    render(
      <ConvItem
        conversation={conv}
        active={false}
        onClick={() => {}}
        onDelete={() => {}}
        onRename={() => {}}
      />,
    );
    expect(screen.getByText("Test Conversation")).toBeTruthy();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(
      <ConvItem
        conversation={conv}
        active={false}
        onClick={onClick}
        onDelete={() => {}}
        onRename={() => {}}
      />,
    );
    fireEvent.click(screen.getByText("Test Conversation"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("shows delete button", () => {
    render(
      <ConvItem
        conversation={conv}
        active={false}
        onClick={() => {}}
        onDelete={() => {}}
        onRename={() => {}}
      />,
    );
    expect(screen.getByLabelText("Delete conversation")).toBeTruthy();
  });

  it("shows backend label", () => {
    render(
      <ConvItem
        conversation={conv}
        active={false}
        onClick={() => {}}
        onDelete={() => {}}
        onRename={() => {}}
      />,
    );
    expect(screen.getByText("claude")).toBeTruthy();
  });
});
