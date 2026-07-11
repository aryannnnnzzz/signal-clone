"use client";

import { PenSquare, Settings, LogOut } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { useAuth } from "@/contexts/AuthContext";

interface SidebarHeaderProps {
  /** Called when the user clicks the "New conversation" (pen) button. */
  onNewChat: () => void;
  /** Called when the user clicks the Settings button. */
  onSettings: () => void;
}

/**
 * Fixed top bar of the sidebar.
 * Shows the current user's avatar (left), the Signal logo + wordmark (centre),
 * and action icon buttons (right) — identical to Signal Desktop layout.
 *
 * Now uses the real authenticated user and provides a logout button.
 * The PenSquare button is now wired to open the NewChatPanel.
 */
export default function SidebarHeader({ onNewChat, onSettings }: SidebarHeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header className="flex items-center justify-between px-3 py-3 bg-signal-sidebar-header border-b border-signal-border flex-shrink-0 h-[60px]">
      {/* Current user avatar */}
      <Avatar
        name={user?.display_name || "User"}
        src={user?.avatar_url || undefined}
        size="sm"
        className="cursor-pointer"
      />

      {/* Signal wordmark + icon */}
      <div className="flex items-center gap-2">
        <svg
          width="22"
          height="22"
          viewBox="0 0 44 44"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle cx="22" cy="22" r="22" fill="#2C6BED" />
          <path
            d="M22 8C14.268 8 8 14.268 8 22c0 2.386.607 4.631 1.677 6.588L8 36l7.617-1.643A13.916 13.916 0 0022 36c7.732 0 14-6.268 14-14S29.732 8 22 8z"
            fill="white"
          />
        </svg>
        <span className="text-signal-primary font-semibold text-[15px] tracking-tight">
          Signal
        </span>
      </div>

      {/* Action icons */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={onNewChat}
          className="p-1.5 rounded-full text-signal-secondary hover:text-signal-primary hover:bg-signal-hover transition-colors"
          aria-label="New conversation"
          title="New conversation"
          id="new-chat-button"
        >
          <PenSquare size={17} />
        </button>
        <button
          onClick={onSettings}
          className="p-1.5 rounded-full text-signal-secondary hover:text-signal-primary hover:bg-signal-hover transition-colors"
          aria-label="Settings"
          title="Settings"
        >
          <Settings size={17} />
        </button>
        <button
          onClick={logout}
          className="p-1.5 rounded-full text-signal-secondary hover:text-red-400 hover:bg-signal-hover transition-colors"
          aria-label="Log out"
          title="Log out"
        >
          <LogOut size={17} />
        </button>
      </div>
    </header>
  );
}
