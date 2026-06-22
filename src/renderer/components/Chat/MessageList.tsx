import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import type { Message } from "../../../shared/types";

interface Props {
  messages: Message[];
  streaming: boolean;
}

export function MessageList({ messages, streaming }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      {messages.map((msg, i) => (
        <div
          key={msg.id}
          className="animate-fade-in-up"
          style={{ animationDelay: `${Math.min(i * 30, 500)}ms` }}
        >
          <MessageBubble message={msg} />
        </div>
      ))}
      {streaming && (
        <div className="flex justify-start mb-3">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-2">
            <span className="animate-pulse text-sm text-gray-500">
              thinking...
            </span>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
