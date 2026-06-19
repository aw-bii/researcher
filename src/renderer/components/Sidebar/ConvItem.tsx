import { useState } from "react";
import type { Conversation } from "../../../shared/types";

interface Props {
  conversation: Conversation;
  active: boolean;
  onClick: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}

export function ConvItem({
  conversation,
  active,
  onClick,
  onDelete,
  onRename,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(conversation.title);
  const isPipeline = conversation.pipelineTemplateId !== null;

  const handleSubmit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== conversation.title) {
      onRename(conversation.id, trimmed);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="px-3 py-1">
        <input
          className="w-full text-sm px-2 py-1 rounded border border-blue-500 dark:border-blue-400 bg-white dark:bg-gray-800 focus:outline-none"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
            if (e.key === "Escape") setEditing(false);
          }}
          onBlur={handleSubmit}
          autoFocus
        />
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-1">
      <button
        onClick={onClick}
        onDoubleClick={() => {
          setEditValue(conversation.title);
          setEditing(true);
        }}
        className={`flex-1 text-left px-3 py-2 rounded-lg text-sm truncate hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
          active ? "bg-gray-200 dark:bg-gray-700" : ""
        }`}
      >
        <div className="font-medium truncate flex items-center gap-1">
          {isPipeline && (
            <svg
              className="w-3 h-3 flex-shrink-0 text-blue-500"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path d="M4 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm8-6a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-5-1h2v2H7V7zm0-4h2v2H7V3z" />
            </svg>
          )}
          <span className="truncate">{conversation.title}</span>
        </div>
        <div className="text-xs text-gray-400 flex gap-2">
          <span>{isPipeline ? "pipeline" : conversation.backend}</span>
          <span>{new Date(conversation.updatedAt).toLocaleDateString()}</span>
        </div>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(conversation.id);
        }}
        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
        aria-label="Delete conversation"
        title="Delete"
      >
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M9 2a1 1 0 0 0-.894.553L7.382 4H4a1 1 0 0 0 0 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6a1 1 0 1 0 0-2h-3.382l-.724-1.447A1 1 0 0 0 11 2H9zM7 8a1 1 0 0 1 2 0v6a1 1 0 1 1-2 0V8zm5-1a1 1 0 0 0-1 1v6a1 1 0 1 0 2 0V8a1 1 0 0 0-1-1z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}
