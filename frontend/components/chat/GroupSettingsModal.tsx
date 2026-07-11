"use client";

import { useState, useEffect, useRef } from "react";
import { X, Camera, LogOut, UserPlus } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { Conversation } from "@/types";

interface GroupSettingsModalProps {
  conversation: Conversation;
  isOpen: boolean;
  onClose: () => void;
  // TODO: Add functions to update group, add member, remove member if necessary
  // For now, we can just display the skeleton if we don't implement full CRUD yet.
}

export default function GroupSettingsModal({
  conversation,
  isOpen,
  onClose,
}: GroupSettingsModalProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [shouldRender, setShouldRender] = useState(isOpen);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
    } else if (shouldRender) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, shouldRender]);

  useEffect(() => {
    if (shouldRender) {
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [shouldRender, onClose]);

  if (!shouldRender || conversation.type !== "group") return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-all duration-200 ${
        isClosing ? "opacity-0" : "opacity-100"
      }`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        ref={modalRef}
        className={`w-[95%] max-w-[400px] bg-signal-sidebar rounded-xl shadow-2xl flex flex-col overflow-hidden border border-signal-border transition-all duration-200 ${
          isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-signal-border">
          <span className="font-semibold text-signal-primary text-lg">Group Settings</span>
          <button 
            className="p-1.5 text-signal-secondary hover:text-signal-primary hover:bg-signal-hover rounded-full transition-colors"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-full bg-signal-hover border border-signal-border flex items-center justify-center mb-4 relative group overflow-hidden">
            <Avatar name={conversation.name} src={conversation.avatarUrl} size="lg" />
            <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center cursor-pointer">
              <Camera className="text-white" size={24} />
            </div>
          </div>
          
          <h2 className="text-xl font-bold text-signal-primary mb-1">{conversation.name}</h2>
          <p className="text-signal-secondary text-sm mb-6">{conversation.memberCount} members</p>

          <div className="w-full space-y-2">
            <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-signal-primary bg-signal-hover rounded-lg hover:bg-signal-hover-hover transition-colors">
              <UserPlus size={18} className="text-signal-blue" />
              <span className="font-medium text-signal-blue">Add members</span>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 bg-red-400/10 rounded-lg hover:bg-red-400/20 transition-colors">
              <LogOut size={18} />
              <span className="font-medium">Leave group</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
