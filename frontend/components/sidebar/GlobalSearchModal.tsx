"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, MessageSquare, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/contexts/ChatContext";
import { searchMessages } from "@/lib/chatService";
import { Message } from "@/types";
import { formatMessageTime } from "@/lib/utils";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const { user } = useAuth();
  const { selectConversation, jumpToMessage, conversations } = useChat();
  
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [shouldRender, setShouldRender] = useState(isOpen);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(onClose, 200);
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setQuery("");
        setResults([]);
      }, 200); // match transition duration
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  useEffect(() => {
    if (!query.trim() || !user) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const msgs = await searchMessages(query.trim(), user.id);
        setResults(msgs);
      } catch (err) {
        console.error("Failed to search messages:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, user]);

  const handleResultClick = async (msg: Message) => {
    handleClose();
    await selectConversation(msg.conversationId);
    await jumpToMessage(msg.conversationId, msg.id, msg.createdAt);
  };

  if (!shouldRender) return null;

  // Group results by conversation
  const groupedResults = results.reduce((acc, msg) => {
    if (!acc[msg.conversationId]) acc[msg.conversationId] = [];
    acc[msg.conversationId].push(msg);
    return acc;
  }, {} as Record<string, Message[]>);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ${
          isClosing ? "opacity-0" : "opacity-100"
        }`}
        onClick={handleClose}
      />
      
      {/* Modal Content */}
      <div 
        className={`relative w-[90%] max-w-[600px] bg-signal-sidebar border border-signal-border rounded-xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden transition-all duration-200 ${
          isClosing ? "opacity-0 scale-95" : "opacity-100 scale-100"
        }`}
      >
        {/* Header / Input */}
        <div className="flex items-center gap-3 p-4 border-b border-signal-border">
          <Search className="text-signal-secondary" size={20} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search messages globally..."
            className="flex-1 bg-transparent border-none outline-none text-signal-primary placeholder:text-signal-muted text-[15px]"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded-full hover:bg-signal-hover text-signal-secondary"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto">
          {!query.trim() ? (
            <div className="p-10 text-center text-signal-muted text-sm">
              Type to search across all conversations
            </div>
          ) : isSearching && results.length === 0 ? (
            <div className="p-10 flex justify-center">
              <Loader2 className="animate-spin text-signal-secondary" size={24} />
            </div>
          ) : results.length === 0 ? (
            <div className="p-10 text-center text-signal-muted text-sm">
              No results found for &quot;{query}&quot;
            </div>
          ) : (
            <div className="py-2">
              {Object.entries(groupedResults).map(([convId, msgs]) => {
                const conv = conversations.find(c => c.id === convId);
                const convName = conv?.name || "Unknown Conversation";
                
                return (
                  <div key={convId} className="mb-4 last:mb-0">
                    <div className="px-4 py-1.5 bg-signal-hover/50 text-[12px] font-semibold text-signal-secondary uppercase tracking-wider flex items-center gap-2">
                      <MessageSquare size={14} />
                      {convName}
                    </div>
                    {msgs.map((msg) => {
                      let text = msg.content;
                      if (msg.contentType === "image" || msg.contentType === "file") {
                        try {
                          text = JSON.parse(msg.content).text || (msg.contentType === "image" ? "📷 Image" : "📎 File");
                        } catch {
                          text = msg.contentType === "image" ? "📷 Image" : "📎 File";
                        }
                      }

                      // Highlight match in preview
                      const parts = text.split(new RegExp(`(${query})`, "gi"));

                      return (
                        <button
                          key={msg.id}
                          onClick={() => handleResultClick(msg)}
                          className="w-full text-left px-4 py-3 hover:bg-signal-hover transition-colors flex flex-col gap-1"
                        >
                          <div className="flex justify-between items-center text-[12px]">
                            <span className="font-medium text-signal-primary">{msg.senderName}</span>
                            <span className="text-signal-muted">{formatMessageTime(msg.createdAt)}</span>
                          </div>
                          <div className="text-[14px] text-signal-secondary truncate max-w-full">
                            {parts.map((part, i) =>
                              part.toLowerCase() === query.toLowerCase() ? (
                                <span key={i} className="text-signal-primary font-medium bg-yellow-500/30 px-0.5 rounded-sm">
                                  {part}
                                </span>
                              ) : (
                                part
                              )
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
