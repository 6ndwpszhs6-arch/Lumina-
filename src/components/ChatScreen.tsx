"use client";

import { useEffect, useRef, useState } from "react";
import { db, generateId } from "@/lib/db";
import type { ChatMessage, UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Send, ShieldAlert, Trash2 } from "lucide-react";

const CONVERSATION_ID = "default";

function buildProfileContext(profile?: UserProfile): string | undefined {
  if (!profile) return undefined;
  const parts: string[] = [];
  if (profile.goal) parts.push(`goal=${profile.goal}`);
  if (profile.activityLevel) parts.push(`activity=${profile.activityLevel}`);
  if (profile.conditions?.length) parts.push(`conditions=${profile.conditions.join(",")}`);
  return parts.length ? parts.join("; ") : undefined;
}

export default function ChatScreen({ profile }: { profile: UserProfile | undefined }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    db.chatMessages
      .where("conversationId")
      .equals(CONVERSATION_ID)
      .sortBy("createdAt")
      .then(setMessages);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const content = input.trim();
    if (!content || sending) return;
    setNotice(null);
    setInput("");

    const userMsg: ChatMessage = {
      id: generateId(),
      conversationId: CONVERSATION_ID,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    await db.chatMessages.put(userMsg);
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.slice(-12).map((m) => ({ role: m.role, content: m.content })),
          profileContext: buildProfileContext(profile),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setNotice(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      const assistantMsg: ChatMessage = {
        id: generateId(),
        conversationId: CONVERSATION_ID,
        role: "assistant",
        content: data.reply,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      await db.chatMessages.put(assistantMsg);
    } catch {
      setNotice("Couldn't reach the assistant. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  };

  const clearConversation = async () => {
    await db.chatMessages.where("conversationId").equals(CONVERSATION_ID).delete();
    setMessages([]);
    setNotice(null);
  };

  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex gap-2 rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            I can help with diet, nutrition, and metabolism topics — including diabetes and PKU education. I&apos;m
            not a doctor and can&apos;t diagnose or prescribe; always check with your care team for medical
            decisions.
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearConversation}
            className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-accent"
            aria-label="Clear conversation"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pb-2">
        {messages.length === 0 && (
          <div className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            Ask about calories, macros, metabolism, diabetes-friendly eating, PKU basics, and more.
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm",
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-foreground"
              )}
            >
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-border bg-card px-3.5 py-2.5 text-sm text-muted-foreground">
              Thinking…
            </div>
          </div>
        )}
        {notice && <p className="text-center text-xs text-danger">{notice}</p>}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 border-t border-border pt-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Ask about diet or metabolism…"
          className="flex-1 rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={send}
          disabled={sending || !input.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
