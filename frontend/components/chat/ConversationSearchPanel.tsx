import { useState, useEffect, useRef } from "react";
import { Search, X, ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import { searchMessages } from "@/lib/chatService";
import { useAuth } from "@/contexts/AuthContext";
import { Message } from "@/types";
import { useChat } from "@/contexts/ChatContext";

interface ConversationSearchPanelProps {
  conversationId: string;
  onClose: () => void;
}

export default function ConversationSearchPanel({ conversationId, onClose }: ConversationSearchPanelProps) {
  const { user } = useAuth();
  const { jumpToMessage } = useChat();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Message[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus input on mount
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!query.trim() || !user) {
      setResults([]);
      setCurrentIndex(-1);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const msgs = await searchMessages(query.trim(), user.id, conversationId);
        setResults(msgs);
        if (msgs.length > 0) {
          setCurrentIndex(0);
          await jumpToMessage(conversationId, msgs[0].id, msgs[0].createdAt);
        } else {
          setCurrentIndex(-1);
        }
      } catch (err) {
        console.error("Failed to search in conversation:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, user, conversationId, jumpToMessage]); // Only re-run when query changes

  const handleNext = async () => {
    if (results.length === 0) return;
    const nextIdx = (currentIndex + 1) % results.length;
    setCurrentIndex(nextIdx);
    const msg = results[nextIdx];
    await jumpToMessage(conversationId, msg.id, msg.createdAt);
  };

  const handlePrev = async () => {
    if (results.length === 0) return;
    const prevIdx = (currentIndex - 1 + results.length) % results.length;
    setCurrentIndex(prevIdx);
    const msg = results[prevIdx];
    await jumpToMessage(conversationId, msg.id, msg.createdAt);
  };

  return (
    <div className="absolute right-4 top-full mt-2 w-72 bg-signal-sidebar border border-signal-border rounded-lg shadow-lg z-20 flex items-center p-2 gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
      <Search size={16} className="text-signal-secondary shrink-0 ml-1" />
      <input
        ref={inputRef}
        type="text"
        placeholder="Search in chat..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleNext();
          }
        }}
        className="flex-1 bg-transparent border-none outline-none text-signal-primary text-sm placeholder:text-signal-muted min-w-0"
      />
      {isSearching ? (
        <Loader2 size={16} className="animate-spin text-signal-secondary shrink-0 mx-1" />
      ) : (
        <span className="text-xs text-signal-muted shrink-0 mx-1 tabular-nums">
          {results.length > 0 ? `${currentIndex + 1}/${results.length}` : (query ? "0/0" : "")}
        </span>
      )}
      <div className="flex items-center border-l border-signal-border pl-1 shrink-0">
        <button
          onClick={handlePrev}
          disabled={results.length === 0}
          className="p-1 rounded text-signal-secondary hover:text-signal-primary hover:bg-signal-hover disabled:opacity-50 disabled:hover:bg-transparent"
        >
          <ChevronUp size={16} />
        </button>
        <button
          onClick={handleNext}
          disabled={results.length === 0}
          className="p-1 rounded text-signal-secondary hover:text-signal-primary hover:bg-signal-hover disabled:opacity-50 disabled:hover:bg-transparent"
        >
          <ChevronDown size={16} />
        </button>
        <button
          onClick={onClose}
          className="p-1 rounded text-signal-secondary hover:text-signal-primary hover:bg-signal-hover ml-1"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
