"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Loader2, Check, ArrowRight } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { searchUsers, type SearchedUser } from "@/lib/userService";
import { useAuth } from "@/contexts/AuthContext";

interface NewGroupPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreate: (name: string, memberIds: string[]) => void;
}

export default function NewGroupPanel({
  isOpen,
  onClose,
  onGroupCreate,
}: NewGroupPanelProps) {
  const { user } = useAuth();
  
  // Search state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchedUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Selection state
  const [selectedUsers, setSelectedUsers] = useState<SearchedUser[]>([]);
  
  // Final creation state
  const [step, setStep] = useState<"select" | "name">("select");
  const [groupName, setGroupName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults([]);
      setSelectedUsers([]);
      setStep("select");
      setGroupName("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
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
          setResults(found.filter((u) => u.id !== user?.id));
        } catch {
          setResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    },
    [user?.id]
  );

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const toggleUser = (u: SearchedUser) => {
    setSelectedUsers((prev) => 
      prev.some(x => x.id === u.id) 
        ? prev.filter(x => x.id !== u.id)
        : [...prev, u]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) return;
    setIsCreating(true);
    try {
      await onGroupCreate(groupName.trim(), selectedUsers.map(u => u.id));
      onClose();
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col bg-signal-sidebar"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-signal-border flex-shrink-0 h-[60px]">
        <div className="flex items-center gap-3">
          {step === "name" && (
            <button onClick={() => setStep("select")} className="text-signal-secondary hover:text-signal-primary">
              <X size={17} className="rotate-45" />
            </button>
          )}
          <span className="text-signal-primary font-semibold text-[15px]">
            {step === "select" ? "Add members" : "Name group"}
          </span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-full text-signal-secondary hover:text-signal-primary hover:bg-signal-hover">
          <X size={17} />
        </button>
      </div>

      {step === "select" ? (
        <>
          <div className="px-3 py-2.5 flex-shrink-0">
            <div className="relative flex items-center mb-2">
              <Search size={14} className="absolute left-3 text-signal-muted pointer-events-none" />
              <input
                ref={inputRef}
                type="search"
                placeholder="Search people..."
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                className="w-full bg-signal-hover text-signal-primary placeholder-signal-muted text-[13px] rounded-full pl-8 pr-8 py-2 outline-none focus:ring-1 focus:ring-signal-blue/40"
              />
            </div>
            
            {/* Selected Pills */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 pb-1 border-b border-signal-border/50">
                {selectedUsers.map(u => (
                  <div key={u.id} className="flex items-center gap-1.5 bg-signal-blue/10 text-signal-blue px-2 py-1 rounded-full text-[12px] font-medium">
                    {u.display_name}
                    <button onClick={() => toggleUser(u)} className="hover:text-white">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {isSearching && <div className="flex justify-center py-8"><Loader2 size={20} className="text-signal-blue animate-spin" /></div>}
            
            {!isSearching && results.length > 0 && (
              <ul role="listbox">
                {results.map((u) => {
                  const isSelected = selectedUsers.some(x => x.id === u.id);
                  return (
                    <li key={u.id}>
                      <button
                        onClick={() => toggleUser(u)}
                        className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-signal-hover transition-colors"
                      >
                        <div className="relative flex-shrink-0">
                          <Avatar name={u.display_name} src={u.avatar_url ?? undefined} size="md" />
                          {isSelected && (
                            <div className="absolute -bottom-1 -right-1 bg-signal-blue text-white rounded-full p-0.5 border-2 border-signal-sidebar">
                              <Check size={10} strokeWidth={3} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-medium text-signal-primary truncate">{u.display_name}</p>
                          <p className="text-[12px] text-signal-muted truncate">@{u.username}</p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          
          <div className="p-4 border-t border-signal-border flex-shrink-0">
            <button
              disabled={selectedUsers.length === 0}
              onClick={() => { setStep("name"); setTimeout(() => nameInputRef.current?.focus(), 50); }}
              className="w-full py-2.5 bg-signal-blue text-white rounded-lg font-medium text-[14px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors hover:bg-signal-blue-hover"
            >
              Next <ArrowRight size={16} />
            </button>
          </div>
        </>
      ) : (
        <div className="p-4 flex flex-col flex-1">
          <div className="flex justify-center mb-6">
             <div className="w-20 h-20 rounded-full bg-signal-hover border-2 border-dashed border-signal-border flex items-center justify-center text-signal-secondary text-xs text-center leading-tight">
                Group<br/>Photo
             </div>
          </div>
          <div className="mb-6">
            <label className="block text-signal-secondary text-[12px] font-medium mb-1.5 uppercase tracking-wider">Group Name</label>
            <input
              ref={nameInputRef}
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Name this group"
              className="w-full bg-signal-hover text-signal-primary placeholder-signal-muted text-[14px] rounded-lg px-4 py-3 outline-none focus:ring-1 focus:ring-signal-blue/40"
              maxLength={100}
            />
          </div>
          <div className="mt-auto pt-4">
            <button
              disabled={!groupName.trim() || isCreating}
              onClick={handleCreate}
              className="w-full py-2.5 bg-signal-blue text-white rounded-lg font-medium text-[14px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors hover:bg-signal-blue-hover"
            >
              {isCreating ? <Loader2 size={18} className="animate-spin" /> : "Create Group"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
