import React, { useRef, useEffect } from "react";

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  isOwn: boolean;
}

export default function ReactionPicker({ onSelect, onClose, isOwn }: ReactionPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  return (
    <div
      ref={pickerRef}
      className={`absolute top-full mt-1 z-50 flex gap-1 p-1.5 rounded-full bg-signal-sidebar border border-signal-border shadow-lg ${
        isOwn ? "right-0" : "left-0"
      }`}
    >
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(emoji);
          }}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-signal-hover transition-colors text-lg"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
