"use client";

/**
 * NewChatPanel — slide-in overlay that lets the user search for people and
 * start a new DM conversation.
 *
 * Behaviour:
 *   - Rendered inside Sidebar when isOpen=true (absolutely positioned over
 *     the conversation list, below the header).
 *   - Autofocuses the search input on open.
 *   - Debounces the API call by 300 ms to avoid hammering the server on
 *     every keystroke.
 *   - Filters out the current user from results so you can't DM yourself.
 *   - Clicking a result calls onSelectUser(userId) and closes the panel.
 *   - Pressing Escape or clicking the ✕ button closes the panel.
 *
 * Architecture:
 *   - Owns only search UI state (query, results, loading, error).
 *   - The actual DM creation + conversation selection is delegated to
 *     ChatContext via the onSelectUser callback.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Loader2 } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { searchUsers, type SearchedUser } from "@/lib/userService";
import { useAuth } from "@/contexts/AuthContext";

interface NewChatPanelProps {
  /** Whether the panel is visible. */
  isOpen: boolean;
  /** Called when the user dismisses the panel without selecting anyone. */
  onClose: () => void;
  /**
   * Called with the selected user's id.
   * The parent (Sidebar → ChatApp) will call ChatContext.openNewChat(userId).
   */
  onSelectUser: (userId: string, displayName: string) => void;
}

export default function NewChatPanel({
  isOpen,
  onClose,
  onSelectUser,
}: NewChatPanelProps) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchedUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Auto-focus input when panel opens ─────────── */
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults([]);
      setSearchError(null);
      // Small timeout so CSS transition finishes before we focus
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  /* ── Debounced search ──────────────────────────── */
  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      setSearchError(null);

      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (!value.trim()) {
        setResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      debounceRef.current = setTimeout(async () => {
        try {
          const found = await searchUsers(value);
          // Filter out the current user from results
          setResults(found.filter((u) => u.id !== user?.id));
        } catch (err) {
          setSearchError(
            err instanceof Error ? err.message : "Search failed."
          );
          setResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    },
    [user?.id]
  );

  /* ── Keyboard: Escape closes panel ────────────── */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  /* ── Cleanup debounce on unmount ──────────────── */
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="absolute inset-0 z-10 flex flex-col bg-signal-sidebar"
      role="dialog"
      aria-modal="true"
      aria-label="New conversation"
    >
      {/* ── Header ─────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-signal-border flex-shrink-0 h-[60px]">
        <span className="text-signal-primary font-semibold text-[15px]">
          New conversation
        </span>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full text-signal-secondary hover:text-signal-primary hover:bg-signal-hover transition-colors"
          aria-label="Close"
        >
          <X size={17} />
        </button>
      </div>

      {/* ── Search input ───────────────────────────── */}
      <div className="px-3 py-2.5 flex-shrink-0">
        <div className="relative flex items-center">
          <Search
            size={14}
            className="absolute left-3 text-signal-muted pointer-events-none"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="search"
            placeholder="Search name or username…"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            className="
              w-full bg-signal-hover text-signal-primary placeholder-signal-muted
              text-[13px] rounded-full pl-8 pr-8 py-2
              outline-none focus:ring-1 focus:ring-signal-blue/40
              transition-shadow duration-150
            "
            aria-label="Search users"
            id="new-chat-search-input"
          />
          {query && (
            <button
              onClick={() => handleQueryChange("")}
              className="absolute right-3 text-signal-muted hover:text-signal-primary transition-colors"
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── Results area ───────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {/* Loading spinner */}
        {isSearching && (
          <div className="flex justify-center py-8">
            <Loader2
              size={20}
              className="text-signal-blue animate-spin"
              aria-label="Searching…"
            />
          </div>
        )}

        {/* Error */}
        {!isSearching && searchError && (
          <div className="mx-3 mt-3 px-3 py-2.5 rounded-lg bg-red-900/30 border border-red-700/40 text-red-300 text-[12px]">
            {searchError}
          </div>
        )}

        {/* Empty query hint */}
        {!isSearching && !searchError && !query.trim() && (
          <p className="text-signal-muted text-[12px] text-center mt-8 px-4">
            Search for people to start a conversation
          </p>
        )}

        {/* No results */}
        {!isSearching &&
          !searchError &&
          query.trim() &&
          results.length === 0 && (
            <p className="text-signal-muted text-[12px] text-center mt-8 px-4">
              No users found for &quot;{query}&quot;
            </p>
          )}

        {/* Results list */}
        {!isSearching && results.length > 0 && (
          <ul role="listbox" aria-label="User search results">
            {results.map((u) => (
              <li key={u.id} role="option" aria-selected="false">
                <button
                  onClick={() => {
                    onSelectUser(u.id, u.display_name);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-signal-hover transition-colors"
                  aria-label={`Start conversation with ${u.display_name}`}
                  id={`new-chat-user-${u.id}`}
                >
                  {/* Avatar + online dot */}
                  <div className="relative flex-shrink-0">
                    <Avatar
                      name={u.display_name}
                      src={u.avatar_url ?? undefined}
                      size="md"
                    />
                    {u.is_online && (
                      <span
                        className="absolute bottom-0 right-0 w-3 h-3 bg-signal-online border-2 border-signal-sidebar rounded-full"
                        aria-hidden="true"
                      />
                    )}
                  </div>

                  {/* Name + username */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-signal-primary truncate">
                      {u.display_name}
                    </p>
                    <p className="text-[12px] text-signal-muted truncate">
                      @{u.username}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
