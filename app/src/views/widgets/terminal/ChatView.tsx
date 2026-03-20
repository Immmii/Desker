import { useEffect, useRef, useMemo } from "react";
import { useChatVM, type ChatMessage } from "../../../viewmodels/chat.vm";

// ── Message Block ──
function MessageBlock({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end mb-3">
        <div className="max-w-[85%] px-4 py-3 rounded-2xl rounded-br-md bg-accent text-white text-[14px] leading-[1.6] whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    );
  }

  if (message.role === "error") {
    return (
      <div className="mb-3 px-4 py-3 rounded-2xl bg-danger/10 border border-danger/20 text-danger text-[13px] leading-[1.6]">
        {message.content}
      </div>
    );
  }

  // assistant
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-5 h-5 rounded-md bg-accent/15 flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <span className="text-[12px] font-semibold text-accent">Claude</span>
      </div>
      <div className="pl-7 text-[14px] text-text-primary leading-[1.7] whitespace-pre-wrap">
        {message.content || (
          <span className="inline-flex items-center gap-1 text-text-secondary/50">
            <span className="w-1.5 h-1.5 rounded-full bg-accent/60 animate-pulse" />
            <span className="w-1.5 h-1.5 rounded-full bg-accent/40 animate-pulse [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-accent/20 animate-pulse [animation-delay:300ms]" />
          </span>
        )}
      </div>
    </div>
  );
}

// ── Empty state ──
function EmptyChat() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-text-secondary/40 gap-3">
      <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </div>
      <p className="text-[14px]">Claude에게 무엇이든 물어보세요</p>
    </div>
  );
}

// ── Main ChatView ──
const EMPTY_MESSAGES: ChatMessage[] = [];

export default function ChatView({ sessionId }: { sessionId: string }) {
  const messagesRaw = useChatVM((s) => s.messagesBySession[sessionId]);
  const messages = messagesRaw ?? EMPTY_MESSAGES;
  const streamingSession = useChatVM((s) => s.streamingSession);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  // Subscribe to IPC events
  useEffect(() => {
    const api = window.deskerAPI?.aiChat;
    if (!api) return;

    const { appendChunk, finishStreaming, addError } = useChatVM.getState();

    const unsubChunk = api.onChunk((sid, chunk) => {
      if (sid === sessionId) appendChunk(sessionId, chunk);
    });
    const unsubDone = api.onDone((sid) => {
      if (sid === sessionId) finishStreaming(sessionId);
    });
    const unsubError = api.onError((sid, err) => {
      if (sid === sessionId) addError(sessionId, err);
    });

    return () => {
      unsubChunk();
      unsubDone();
      unsubError();
    };
  }, [sessionId]);

  const isStreaming = streamingSession === sessionId;

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4">
      {messages.length === 0 ? (
        <EmptyChat />
      ) : (
        <>
          {messages.map((msg) => (
            <MessageBlock key={msg.id} message={msg} />
          ))}
          {isStreaming && (
            <div className="text-[11px] text-text-secondary/30 mt-2">
              응답 중...
            </div>
          )}
        </>
      )}
    </div>
  );
}
