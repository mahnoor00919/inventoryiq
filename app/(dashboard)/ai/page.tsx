// app/(dashboard)/ai/page.tsx
"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles, Send, RefreshCw, User,
  TrendingDown, Package, ShoppingCart, BarChart3,
  AlertTriangle, Lightbulb, Brain,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

const SUGGESTED_PROMPTS = [
  { icon: AlertTriangle, label: "Low stock alerts",    prompt: "Which products are running low on stock and need reordering?",       color: "text-amber-400"  },
  { icon: Package,       label: "Out of stock",        prompt: "Show me all products that are currently out of stock.",               color: "text-red-400"    },
  { icon: ShoppingCart,  label: "Pending orders",      prompt: "How many pending orders are there and what products are requested?",  color: "text-violet-400" },
  { icon: BarChart3,     label: "Inventory summary",   prompt: "Give me a complete summary of the current inventory status.",         color: "text-indigo-400" },
  { icon: TrendingDown,  label: "Reorder suggestions", prompt: "Which products should I reorder urgently and from which suppliers?",  color: "text-pink-400"   },
  { icon: Lightbulb,     label: "Category analytics",  prompt: "Which product categories have the most items and what is their total stock value?", color: "text-emerald-400" },
];

// ── Typing dots ───────────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

// ── Inline bold + bullet rendering ───────────────────────────────────────────
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i} className="text-gray-100 font-semibold">{p.slice(2, -2)}</strong>
      : p
  );
}

function FormattedMessage({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;

        if (line.trim().startsWith("•") || line.trim().startsWith("-")) {
          return (
            <div key={i} className="flex gap-2">
              <span className="text-indigo-400 mt-0.5 flex-shrink-0">•</span>
              <span>{renderInline(line.trim().replace(/^[•\-]\s*/, ""))}</span>
            </div>
          );
        }

        const numMatch = line.trim().match(/^(\d+)\.\s+(.+)/);
        if (numMatch) {
          return (
            <div key={i} className="flex gap-2">
              <span className="text-indigo-400 flex-shrink-0 font-mono text-xs mt-0.5">{numMatch[1]}.</span>
              <span>{renderInline(numMatch[2])}</span>
            </div>
          );
        }

        if (line.trim().endsWith(":") && line.trim().length < 60) {
          return <p key={i} className="font-semibold text-indigo-300 mt-2 first:mt-0">{renderInline(line.trim())}</p>;
        }

        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-3 mb-4", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border",
        isUser
          ? "bg-indigo-600/20 border-indigo-500/30"
          : "bg-gradient-to-br from-indigo-600 to-violet-600 border-transparent"
      )}>
        {isUser
          ? <User className="h-4 w-4 text-indigo-400" />
          : <Brain className="h-4 w-4 text-white" />
        }
      </div>

      {/* Bubble */}
      <div className={cn(
        "max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
        isUser
          ? "bg-indigo-600/15 border border-indigo-500/20 text-gray-100 rounded-tr-sm"
          : "bg-gray-900 border border-gray-800 text-gray-300 rounded-tl-sm"
      )}>
        {message.isStreaming && message.content === ""
          ? <TypingIndicator />
          : <FormattedMessage content={message.content} />
        }
        <p className={cn(
          "text-[10px] mt-1.5 select-none",
          isUser ? "text-indigo-400/50 text-right" : "text-gray-600"
        )}>
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AIPage() {
  const { user } = useAuthStore();
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);
  const abortRef       = useRef<AbortController | null>(null);

  // Welcome message
  useEffect(() => {
    setMessages([{
      id:        "welcome",
      role:      "assistant",
      content:   `Hello ${user?.name?.split(" ")[0] || "there"}!\n\nI'm **InventoryIQ AI**, your intelligent inventory management assistant. I have real-time access to your live inventory database right now.\n\nI can help you with:\n• Current stock levels and low stock alerts\n• Out-of-stock products that need immediate reordering\n• Pending, approved, and fulfilled order status\n• Inventory value and category analytics\n• Supplier contact info and reorder recommendations\n\nPlease ask a question related to products, stock, orders, or inventory analytics.`,
      timestamp: new Date(),
    }]);
  }, [user?.name]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    const userText = text.trim();
    if (!userText || isLoading) return;
    setInput("");

    const userMsg: Message = {
      id:        crypto.randomUUID(),
      role:      "user",
      content:   userText,
      timestamp: new Date(),
    };

    const aiMsg: Message = {
      id:          crypto.randomUUID(),
      role:        "assistant",
      content:     "",
      timestamp:   new Date(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, userMsg, aiMsg]);
    setIsLoading(true);

    const history = [...messages, userMsg]
      .filter(m => m.id !== "welcome")
      .map(m => ({ role: m.role, content: m.content }));

    try {
      abortRef.current = new AbortController();
      const res = await fetch("/api/ai", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ messages: history }),
        signal:  abortRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const reader  = res.body!.getReader();
      const decoder = new TextDecoder();
      let   buf     = "";
      let   full    = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw || raw === "[DONE]") continue;
          try {
            const parsed = JSON.parse(raw) as any;
            const text = parsed.choices?.[0]?.delta?.content ?? parsed.choices?.[0]?.message?.content ?? parsed.text;
            if (typeof text !== "string") continue;
            full += text;
            setMessages(prev =>
              prev.map(m => m.id === aiMsg.id ? { ...m, content: full, isStreaming: true } : m)
            );
          } catch {
            // skip malformed event lines
          }
        }
      }

      setMessages(prev =>
        prev.map(m =>
          m.id === aiMsg.id
            ? { ...m, content: full || "I couldn't generate a response. Please try again.", isStreaming: false }
            : m
        )
      );
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setMessages(prev =>
        prev.map(m =>
          m.id === aiMsg.id
            ? { ...m, content: `⚠️ Error: ${msg}`, isStreaming: false }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      abortRef.current = null;
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [messages, isLoading]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function clearChat() {
    abortRef.current?.abort();
    setIsLoading(false);
    setMessages([{
      id:        "welcome-reset",
      role:      "assistant",
      content:   "Chat cleared! How can I help you with your inventory today?\n\nPlease ask a question related to products, stock, orders, or inventory analytics.",
      timestamp: new Date(),
    }]);
  }

  const hasOnlyWelcome = messages.length <= 1;

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      <Header
        title="InventoryIQ AI"
        subtitle="Intelligent inventory assistant — live database access"
      />

      <div className="flex-1 flex flex-col overflow-hidden p-4 gap-4">

        {/* Status bar */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-indigo-900/20 border border-indigo-500/20">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/25">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-100 text-sm">InventoryIQ AI</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Connected to live database · Powered by Claude · Role:{" "}
              <span className="text-indigo-400 font-medium">{user?.role}</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-400 font-medium">Live</span>
            </div>
            <p className="text-[10px] text-gray-600">Inventory-only assistant</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto rounded-2xl bg-gray-900 border border-gray-800 p-4">
          {/* Quick-action chips — only before first real message */}
          {hasOnlyWelcome && (
            <div className="mb-6">
              <p className="text-xs text-gray-600 font-medium uppercase tracking-wider mb-3">
                Quick actions
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                {SUGGESTED_PROMPTS.map(s => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.label}
                      onClick={() => sendMessage(s.prompt)}
                      className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-800 border border-gray-700
                                 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all text-left group"
                    >
                      <Icon className={cn("h-4 w-4 flex-shrink-0", s.color)} />
                      <span className="text-xs text-gray-400 group-hover:text-gray-200 transition-colors font-medium">
                        {s.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {messages.map(msg => <MessageBubble key={msg.id} message={msg} />)}
          <div ref={messagesEndRef} />
        </div>

        {/* Off-topic notice */}
        <div className="px-1">
          <p className="text-[10px] text-gray-700 text-center">
            🔒 InventoryIQ AI only answers questions about products, stock, orders, and inventory analytics.
            Off-topic questions will be declined.
          </p>
        </div>

        {/* Input */}
        <div className="rounded-2xl bg-gray-900 border border-gray-800 p-3">
          <div className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about stock levels, reorder suggestions, pending orders…"
              rows={1}
              disabled={isLoading}
              className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600
                         resize-none focus:outline-none leading-relaxed py-1
                         disabled:opacity-50 max-h-32 overflow-y-auto"
              style={{ minHeight: "24px" }}
            />
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={clearChat}
                title="Clear chat"
                className="p-2 rounded-xl text-gray-600 hover:text-gray-400 hover:bg-gray-800 transition-all"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600
                           text-white transition-all shadow-lg shadow-indigo-500/20
                           hover:from-indigo-500 hover:to-violet-500
                           disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {isLoading
                  ? <RefreshCw className="h-4 w-4 animate-spin" />
                  : <Send className="h-4 w-4" />
                }
              </button>
            </div>
          </div>
          <p className="text-[10px] text-gray-700 mt-2 px-1">
            <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for new line
          </p>
        </div>
      </div>
    </div>
  );
}



// ---
// "use client";
// // app/(dashboard)/ai/page.tsx
// import { useState, useRef, useEffect, useCallback } from "react";
// import {
//   Sparkles, Send, RefreshCw, Bot, User,
//   TrendingDown, Package, ShoppingCart, BarChart3,
//   AlertTriangle, Lightbulb
// } from "lucide-react";
// import { Header } from "@/components/layout/Header";
// import { useAuthStore } from "@/store/auth.store";
// import { cn } from "@/lib/utils";

// interface Message {
//   id: string;
//   role: "user" | "assistant";
//   content: string;
//   timestamp: Date;
//   isStreaming?: boolean;
// }

// // Suggested prompts grouped by category
// const SUGGESTED_PROMPTS = [
//   { icon: AlertTriangle, label: "Low stock alerts",     prompt: "Which products are running low on stock and need reordering?",      color: "text-amber-400"  },
//   { icon: Package,       label: "Out of stock",         prompt: "Show me all products that are currently out of stock.",              color: "text-red-400"    },
//   { icon: ShoppingCart,  label: "Pending orders",       prompt: "How many pending orders are there and what products are requested?", color: "text-violet-400" },
//   { icon: BarChart3,     label: "Inventory summary",    prompt: "Give me a full summary of the current inventory status.",            color: "text-indigo-400" },
//   { icon: TrendingDown,  label: "Reorder suggestions",  prompt: "Which products should I reorder urgently and from which suppliers?", color: "text-pink-400"   },
//   { icon: Lightbulb,     label: "Top categories",       prompt: "Which product categories have the most items and what is their total stock value?", color: "text-emerald-400" },
// ];

// function TypingIndicator() {
//   return (
//     <div className="flex items-center gap-1.5 px-4 py-3">
//       {[0, 1, 2].map(i => (
//         <span
//           key={i}
//           className="w-2 h-2 rounded-full bg-purple-400 animate-bounce"
//           style={{ animationDelay: `${i * 0.15}s` }}
//         />
//       ))}
//     </div>
//   );
// }

// function MessageBubble({ message }: { message: Message }) {
//   const isUser = message.role === "user";

//   return (
//     <div className={cn("flex gap-3 mb-4", isUser && "flex-row-reverse")}>
//       {/* Avatar */}
//       <div className={cn(
//         "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
//         isUser
//           ? "bg-purple-600/20 border border-purple-500/30"
//           : "bg-gradient-to-br from-purple-600 to-pink-600"
//       )}>
//         {isUser
//           ? <User className="h-4 w-4 text-purple-400" />
//           : <Sparkles className="h-4 w-4 text-white" />
//         }
//       </div>

//       {/* Bubble */}
//       <div className={cn(
//         "max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
//         isUser
//           ? "bg-purple-600/20 border border-purple-500/25 text-rose-100 rounded-tr-sm"
//           : "bg-[#1a0f1a] border border-rose-900/30 text-rose-100/90 rounded-tl-sm"
//       )}>
//         {message.isStreaming && message.content === "" ? (
//           <TypingIndicator />
//         ) : (
//           <FormattedMessage content={message.content} />
//         )}
//         <p className={cn(
//           "text-[10px] mt-1.5 select-none",
//           isUser ? "text-purple-400/60 text-right" : "text-rose-400/40"
//         )}>
//           {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
//         </p>
//       </div>
//     </div>
//   );
// }

// // Renders AI markdown-ish responses with basic formatting
// function FormattedMessage({ content }: { content: string }) {
//   // Convert **bold**, bullet lists, and line breaks
//   const lines = content.split("\n");

//   return (
//     <div className="space-y-1">
//       {lines.map((line, i) => {
//         if (!line.trim()) return <div key={i} className="h-1" />;

//         // Bullet points
//         if (line.trim().startsWith("•") || line.trim().startsWith("-")) {
//           const text = line.trim().replace(/^[•\-]\s*/, "");
//           return (
//             <div key={i} className="flex gap-2">
//               <span className="text-purple-400 mt-0.5 flex-shrink-0">•</span>
//               <span>{renderInline(text)}</span>
//             </div>
//           );
//         }

//         // Numbered lists
//         const numberedMatch = line.trim().match(/^(\d+)\.\s+(.+)/);
//         if (numberedMatch) {
//           return (
//             <div key={i} className="flex gap-2">
//               <span className="text-purple-400 flex-shrink-0 font-mono text-xs mt-0.5">
//                 {numberedMatch[1]}.
//               </span>
//               <span>{renderInline(numberedMatch[2])}</span>
//             </div>
//           );
//         }

//         // Headers (lines ending with :)
//         if (line.trim().endsWith(":") && line.trim().length < 60) {
//           return (
//             <p key={i} className="font-semibold text-purple-300 mt-2 first:mt-0">
//               {renderInline(line.trim())}
//             </p>
//           );
//         }

//         return <p key={i}>{renderInline(line)}</p>;
//       })}
//     </div>
//   );
// }

// function renderInline(text: string): React.ReactNode {
//   // Handle **bold**
//   const parts = text.split(/(\*\*[^*]+\*\*)/g);
//   return parts.map((part, i) => {
//     if (part.startsWith("**") && part.endsWith("**")) {
//       return <strong key={i} className="text-rose-100 font-semibold">{part.slice(2, -2)}</strong>;
//     }
//     return part;
//   });
// }

// export default function AIPage() {
//   const { user } = useAuthStore();
//   const [messages, setMessages] = useState<Message[]>([]);
//   const [input, setInput]       = useState("");
//   const [isLoading, setIsLoading] = useState(false);
//   const messagesEndRef = useRef<HTMLDivElement>(null);
//   const inputRef       = useRef<HTMLTextAreaElement>(null);
//   const abortRef       = useRef<AbortController | null>(null);

//   // Welcome message on mount
//   useEffect(() => {
//     setMessages([{
//       id:        "welcome",
//       role:      "assistant",
//       content:   `Hello ${user?.name?.split(" ")[0] || "there"}! 🌸\n\nI'm **inventoryIQ AI**, your intelligent inventory assistant. I have access to your live inventory data right now.\n\nYou can ask me about:\n• Current stock levels and low stock alerts\n• Out-of-stock products that need reordering\n• Pending orders and approvals\n• Inventory value and analytics\n• Supplier and reorder recommendations\n\nWhat would you like to know?`,
//       timestamp: new Date(),
//     }]);
//   }, [user?.name]);

//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [messages]);

//   const sendMessage = useCallback(async (text: string) => {
//     const userText = text.trim();
//     if (!userText || isLoading) return;

//     setInput("");

//     const userMsg: Message = {
//       id:        crypto.randomUUID(),
//       role:      "user",
//       content:   userText,
//       timestamp: new Date(),
//     };

//     const assistantMsg: Message = {
//       id:          crypto.randomUUID(),
//       role:        "assistant",
//       content:     "",
//       timestamp:   new Date(),
//       isStreaming: true,
//     };

//     setMessages(prev => [...prev, userMsg, assistantMsg]);
//     setIsLoading(true);

//     // Build conversation history (exclude welcome, exclude current empty assistant msg)
//     const history = [...messages, userMsg]
//       .filter(m => m.id !== "welcome")
//       .map(m => ({ role: m.role, content: m.content }));

//     try {
//       abortRef.current = new AbortController();

//       const res = await fetch("/api/ai", {
//         method:  "POST",
//         headers: { "Content-Type": "application/json" },
//         body:    JSON.stringify({ messages: history }),
//         signal:  abortRef.current.signal,
//       });

//       if (!res.ok) {
//         const err = await res.json().catch(() => ({ error: "Unknown error" }));
//         throw new Error(err.error || `HTTP ${res.status}`);
//       }

//       const reader  = res.body!.getReader();
//       const decoder = new TextDecoder();
//       let   buffer  = "";
//       let   full    = "";

//       while (true) {
//         const { done, value } = await reader.read();
//         if (done) break;

//         buffer += decoder.decode(value, { stream: true });
//         const lines = buffer.split("\n");
//         buffer = lines.pop() || "";

//         for (const line of lines) {
//           if (!line.startsWith("data: ")) continue;
//           const data = line.slice(6).trim();
//           if (data === "[DONE]") break;
//           try {
//             const parsed = JSON.parse(data) as { text: string };
//             full += parsed.text;
//             setMessages(prev =>
//               prev.map(m =>
//                 m.id === assistantMsg.id
//                   ? { ...m, content: full, isStreaming: true }
//                   : m
//               )
//             );
//           } catch { /* skip malformed chunks */ }
//         }
//       }

//       // Mark streaming done
//       setMessages(prev =>
//         prev.map(m =>
//           m.id === assistantMsg.id
//             ? { ...m, content: full || "I couldn't generate a response. Please try again.", isStreaming: false }
//             : m
//         )
//       );
//     } catch (err: unknown) {
//       if (err instanceof Error && err.name === "AbortError") return;
//       const errorMsg = err instanceof Error ? err.message : "Something went wrong.";
//       setMessages(prev =>
//         prev.map(m =>
//           m.id === assistantMsg.id
//             ? { ...m, content: `⚠️ Error: ${errorMsg}`, isStreaming: false }
//             : m
//         )
//       );
//     } finally {
//       setIsLoading(false);
//       abortRef.current = null;
//       setTimeout(() => inputRef.current?.focus(), 100);
//     }
//   }, [messages, isLoading]);

//   function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
//     if (e.key === "Enter" && !e.shiftKey) {
//       e.preventDefault();
//       sendMessage(input);
//     }
//   }

//   function clearChat() {
//     abortRef.current?.abort();
//     setIsLoading(false);
//     setMessages([{
//       id:        "welcome-reset",
//       role:      "assistant",
//       content:   "Chat cleared! 🌸 How can I help you with your inventory today?",
//       timestamp: new Date(),
//     }]);
//   }

//   const hasOnlyWelcome = messages.length <= 1;

//   return (
    
//     <div className="flex flex-col h-screen">
//       <Header
//         title="inventoryIQ AI"
//         subtitle="Intelligent inventory assistant with live data access"
//       />

//       <div className="flex-1 flex flex-col overflow-hidden p-4 gap-4">
//         {/* AI header card */}
//         <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-purple-900/30 to-pink-900/20 border border-purple-500/20">
//           <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/30">
//             <Sparkles className="h-6 w-6 text-white" />
//           </div>
//           <div className="flex-1 min-w-0">
//             <h3 className="font-bold text-rose-50 text-base">inventoryIQ AI</h3>
//             <p className="text-xs text-rose-300/60">
//               Connected to live inventory · Powered by Claude · Role: <span className="text-purple-400 font-medium">{user?.role}</span>
//             </p>
//           </div>
//           <div className="flex items-center gap-1.5">
//             <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
//             <span className="text-xs text-emerald-400 font-medium">Live</span>
//           </div>
//         </div>

//         {/* Messages area */}
//         <div className="flex-1 overflow-y-auto rounded-2xl bg-[#150f15] border border-rose-900/20 p-4">
//           {/* Suggested prompts shown only before any real conversation */}
//           {hasOnlyWelcome && (
//             <div className="mb-6">
//               <p className="text-xs text-rose-400/50 font-medium uppercase tracking-wider mb-3 px-1">
//                 Quick actions
//               </p>
//               <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
//                 {SUGGESTED_PROMPTS.map((s) => {
//                   const Icon = s.icon;
//                   return (
//                     <button
//                       key={s.label}
//                       onClick={() => sendMessage(s.prompt)}
//                       className="flex items-center gap-2.5 p-3 rounded-xl bg-[#1a0f1a] border border-rose-900/25
//                                  hover:border-purple-500/30 hover:bg-purple-500/5 transition-all text-left group"
//                     >
//                       <Icon className={cn("h-4 w-4 flex-shrink-0", s.color)} />
//                       <span className="text-xs text-rose-200/70 group-hover:text-rose-100 transition-colors font-medium">
//                         {s.label}
//                       </span>
//                     </button>
//                   );
//                 })}
//               </div>
//             </div>
//           )}

//           {/* Chat messages */}
//           {messages.map(msg => (
//             <MessageBubble key={msg.id} message={msg} />
//           ))}
//           <div ref={messagesEndRef} />
//         </div>

//         {/* Input area */}
//         <div className="rounded-2xl bg-[#150f15] border border-rose-900/30 p-3">
//           <div className="flex items-end gap-3">
//             <textarea
//               ref={inputRef}
//               value={input}
//               onChange={e => setInput(e.target.value)}
//               onKeyDown={handleKeyDown}
//               placeholder="Ask about stock levels, orders, reorder suggestions…"
//               rows={1}
//               disabled={isLoading}
//               className="flex-1 bg-transparent text-sm text-rose-100 placeholder-rose-400/30
//                          resize-none focus:outline-none leading-relaxed py-1
//                          disabled:opacity-50 max-h-32 overflow-y-auto"
//               style={{ minHeight: "24px" }}
//             />

//             <div className="flex items-center gap-2 flex-shrink-0">
//               {/* Clear button */}
//               <button
//                 onClick={clearChat}
//                 title="Clear chat"
//                 className="p-2 rounded-xl text-rose-400/40 hover:text-rose-300/70
//                            hover:bg-rose-500/10 transition-all"
//               >
//                 <RefreshCw className="h-4 w-4" />
//               </button>

//               {/* Send button */}
//               <button
//                 onClick={() => sendMessage(input)}
//                 disabled={!input.trim() || isLoading}
//                 className="p-2.5 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600
//                            text-white transition-all shadow-lg shadow-purple-500/20
//                            hover:from-purple-500 hover:to-pink-500
//                            disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
//               >
//                 {isLoading
//                   ? <RefreshCw className="h-4 w-4 animate-spin" />
//                   : <Send className="h-4 w-4" />
//                 }
//               </button>
//             </div>
//           </div>

//           <p className="text-[10px] text-rose-400/30 mt-2 px-1">
//             Press <kbd className="text-rose-400/50">Enter</kbd> to send · <kbd className="text-rose-400/50">Shift+Enter</kbd> for new line ·
//             Only inventory questions are answered
//           </p>
//         </div>
//       </div>
//     </div>
    
//   );
// }