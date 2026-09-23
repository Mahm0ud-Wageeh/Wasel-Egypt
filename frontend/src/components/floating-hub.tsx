"use client";

/**
 * Signature Floating Hub — AI Copilot FAB.
 * Self-contained global widget connected to real AiContext & backend.
 */

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Sparkles, X, Route, MapPin, Bell, Ticket, Headset, Loader2, Send } from "lucide-react";
import type { NavigateFn, ScreenKey } from "@/lib/navigation";
import { useAi } from "@/contexts/AiContext";

export default function FloatingHub({
  navigate,
  current,
}: {
  navigate: NavigateFn;
  current: ScreenKey;
}) {
  // Hooks must be called unconditionally — the early-return guard is BELOW them.
  const [open, setOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [message, setMessage] = useState("");
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const { messages, isTyping, sendMessage, executeAction } = useAi();

  const ACTIONS: { label: string; icon: typeof Route; onClick: () => void }[] = [
    { label: "المساعد الذكي", icon: Sparkles, onClick: () => setChatOpen(true) },
    { label: "خطط رحلة", icon: Route, onClick: () => navigate("planner") },
    { label: "أقرب محطة", icon: MapPin, onClick: () => navigate("map") },
    { label: "التنبيهات", icon: Bell, onClick: () => navigate("notifications") },
    { label: "تذكرة ذكية", icon: Ticket, onClick: () => navigate("fares") },
    { label: "المجتمع", icon: Headset, onClick: () => navigate("community") },
  ];

  const handleSend = async () => {
    const text = message.trim();
    if (!text || isTyping) return;
    setMessage("");
    await sendMessage(text, "ar");
  };

  useEffect(() => {
    if (chatOpen && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, chatOpen]);


  return (
    <>
      {chatOpen ? (
        <div className="rise-in fixed bottom-24 start-4 z-[60] flex h-[480px] w-[min(92vw,380px)] flex-col overflow-hidden rounded-3xl border border-bone bg-white shadow-[0_24px_64px_-16px_rgba(9,12,29,0.35)] md:bottom-28 md:start-6">
          {/* header */}
          <div className="flex items-center justify-between border-b border-bone bg-ink px-4 py-3.5 text-white">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-full bg-brand">
                <Sparkles className="size-4" />
              </span>
              <div className="leading-tight">
                <div className="font-head text-[13px] font-black">مساعد واصل الذكي</div>
                <div className="text-[10px] text-white/60">ذكاء اصطناعي لشبكة النقل بالقاهرة</div>
              </div>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="cursor-pointer rounded-full p-1.5 hover:bg-white/10"
              aria-label="إغلاق المساعد"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* messages container */}
          <div ref={chatScrollRef} className="flex-1 space-y-3 overflow-y-auto bg-mist px-3.5 py-4">
            {messages.length === 0 ? (
              <div className="card-flat me-auto max-w-[90%] rounded-2xl border border-bone bg-white p-3.5 text-[12.5px] leading-relaxed text-carbon">
                أهلاً بك في واصل مصر! أنا مساعدك الذكي المتصل بالشبكة. اسألني عن أسرع مسار، الأجرة الرسمية، خطوط المترو، أو كيفية الوصول لأي وجهة في القاهرة الكبرى.
              </div>
            ) : null}

            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed",
                  m.role === "user"
                    ? "ms-auto bg-ink text-white"
                    : "me-auto border border-bone bg-white text-carbon"
                )}
              >
                <div>{m.content}</div>

                {m.actions && m.actions.length > 0 ? (
                  <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-bone/60 pt-2">
                    {m.actions.map((act, aIdx) => (
                      <button
                        key={aIdx}
                        type="button"
                        onClick={() => executeAction(act, navigate)}
                        className="rounded-full bg-interactive/10 px-2.5 py-1 text-[11px] font-bold text-interactive hover:bg-interactive/20"
                      >
                        {act.label_ar || act.action}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}

            {isTyping ? (
              <div className="me-auto inline-flex items-center gap-2 rounded-2xl border border-bone bg-white px-3 py-2 text-[12px] font-medium text-ash">
                <Loader2 className="size-3.5 animate-spin text-interactive" />
                جارٍ تحليل الشبكة والتفكير…
              </div>
            ) : null}
          </div>

          {/* input */}
          <div className="flex items-center gap-2 border-t border-bone bg-white p-3">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="اسأل عن أي رحلة أو محطة…"
              className="h-10 flex-1 rounded-full border border-bone bg-mist px-4 text-[13px] outline-none placeholder:text-ash focus:border-interactive/50"
            />
            <button
              onClick={handleSend}
              disabled={isTyping || !message.trim()}
              className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-ink text-white hover:bg-carbon disabled:opacity-50"
              aria-label="إرسال"
            >
              <Send className="size-4" />
            </button>
          </div>
        </div>
      ) : null}

      <div className="fixed bottom-20 start-4 z-[60] flex flex-col items-start gap-2.5 md:bottom-8 md:start-6">
        {open
          ? ACTIONS.map((a) => (
              <button
                key={a.label}
                onClick={() => {
                  a.onClick();
                  setOpen(false);
                }}
                className="rise-in glass flex h-11 cursor-pointer items-center gap-2.5 rounded-full px-4 text-[12.5px] font-bold text-ink shadow-[0_10px_30px_-8px_rgba(9,12,29,0.25)] hover:bg-white"
              >
                <a.icon className="size-4 text-interactive" />
                {a.label}
              </button>
            ))
          : null}
        <button
          onClick={() => {
            if (open) {
              setOpen(false);
            } else {
              setOpen(true);
            }
          }}
          className={cn(
            "conic-border flex size-14 cursor-pointer items-center justify-center rounded-full bg-ink text-white shadow-[0_14px_36px_-10px_rgba(102,71,240,0.5)] settle-fast hover:scale-105 active:scale-95"
          )}
          aria-label={open ? "مساعد واصل الذكي" : "فتح المحور العائم"}
        >
          {open ? <X className="size-5" /> : <Sparkles className="size-5" />}
        </button>
      </div>
    </>
  );
}
