"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Smile, Paperclip, Mic, Send, Trash2 } from "lucide-react";
import EmojiPicker, { Theme, EmojiClickData } from "emoji-picker-react";
import { useSettings } from "@/contexts/SettingsContext";

interface MessageComposerProps {
  /**
   * Called when the user sends a message.
   * The composer clears its draft immediately (optimistic) and awaits the
   * promise. Any error is handled by the caller (ChatContext).
   */
  onSend: (content: string, contentType?: "text" | "image" | "file" | "voice") => Promise<void>;
  /** Called after 400 ms of typing — send a typing_start WS frame. */
  onTypingStart: () => void;
  /** Called after 1 s of inactivity or immediately on send — send typing_stop. */
  onTypingStop: () => void;
  replyingToMessage?: import("@/types").Message | null;
  onCancelReply?: () => void;
}

interface AttachmentData {
  url: string;
  name: string;
  size: number;
  type: string;
}

/**
 * Message composition bar at the bottom of the chat window.
 *
 * - Emoji button (left)
 * - Auto-resizing textarea (up to ~5 lines)
 * - Attachment clip button (right, always visible)
 * - Send button (right, shown when draft is non-empty)
 * - Mic button (right, shown when draft is empty)
 *
 * Enter sends; Shift+Enter inserts a newline.
 * The send button is disabled while a message is being sent.
 */
export default function MessageComposer({ onSend, onTypingStart, onTypingStop, replyingToMessage, onCancelReply }: MessageComposerProps) {
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const { settings } = useSettings();
  
  const [attachment, setAttachment] = useState<AttachmentData | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSendingVoiceRef = useRef(false);
  const recordingTimeRef = useRef(0);

  // Refs for debounce timers — mutated without triggering re-renders
  // debounceRef:  fires typing_start 400 ms after first keystroke in a burst
  // stopRef:      fires typing_stop  1 s  after the last keystroke
  // isTypingRef:  tracks whether we've already sent typing_start for this burst
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // Cancel all pending timers on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        clearInterval(debounceRef.current);
      }
      if (stopRef.current) clearTimeout(stopRef.current);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Auto-resize textarea height based on content
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [draft]);

  // Handle click outside for Emoji Picker
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle Escape key to close picker
  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape" && showEmojiPicker) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showEmojiPicker]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /**
   * Handle every draft change.
   * - Debounce typing_start: fire once 400 ms after first keystroke.
   * - Reset stop timer: fire typing_stop 1 s after the LAST keystroke.
   */
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(e.target.value);

    // If draft just became empty, stop typing immediately
    if (!e.target.value.trim()) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        clearInterval(debounceRef.current);
        debounceRef.current = null;
      }
      if (stopRef.current) { clearTimeout(stopRef.current); stopRef.current = null; }
      if (isTypingRef.current) {
        isTypingRef.current = false;
        onTypingStop();
      }
      return;
    }

    // Reset the 1 s stop timer on every keystroke
    if (stopRef.current) clearTimeout(stopRef.current);
    stopRef.current = setTimeout(() => {
      stopRef.current = null;
      if (isTypingRef.current) {
        isTypingRef.current = false;
        onTypingStop();
      }
    }, 1_000);

    // Schedule typing_start if not already sent for this burst
    if (!isTypingRef.current && !debounceRef.current) {
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        isTypingRef.current = true;
        console.log("[DEBUG] MessageComposer calling onTypingStart()");
        onTypingStart();
        
        // Setup an interval to re-send typing_start every 2.5 seconds
        // so the 3-second safety timer on the receiving end doesn't expire
        // while the user is still typing a long message.
        debounceRef.current = setInterval(() => {
          onTypingStart();
        }, 2500);
      }, 400);
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    if (!textareaRef.current) return;
    
    const cursorPosition = textareaRef.current.selectionStart;
    const textBeforeCursor = draft.substring(0, cursorPosition);
    const textAfterCursor = draft.substring(textareaRef.current.selectionEnd);
    
    const newDraft = textBeforeCursor + emojiData.emoji + textAfterCursor;
    setDraft(newDraft);
    
    // Calculate new cursor position
    const newCursorPosition = cursorPosition + emojiData.emoji.length;
    
    // Use timeout to allow React state to update before setting selection
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 0);
  };

  const handleFileUpload = async (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      setUploadError("File too large (max 50MB)");
      setTimeout(() => setUploadError(""), 3000);
      return;
    }
    
    setIsUploading(true);
    setUploadError("");
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      const token = localStorage.getItem("signal_token");
      
      const res = await fetch(`${API_BASE}/api/upload`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: formData
      });
      
      if (!res.ok) throw new Error("Upload failed");
      
      const data = await res.json();
      setAttachment(data);
    } catch {
      setUploadError("Failed to upload file");
      setTimeout(() => setUploadError(""), 3000);
    } finally {
      setIsUploading(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    for (const item of items) {
      if (item.type.indexOf("image") === 0 || item.type.indexOf("application") === 0) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          handleFileUpload(file);
          break;
        }
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleSend = async () => {
    const content = draft.trim();
    if ((!content && !attachment) || isSending || isUploading) return;

    // Stop typing immediately — clear timers, notify server
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      clearInterval(debounceRef.current);
      debounceRef.current = null;
    }
    if (stopRef.current) { clearTimeout(stopRef.current); stopRef.current = null; }
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onTypingStop();
    }

    setIsSending(true);
    try {
      if (attachment) {
        const payload = JSON.stringify({
          text: content,
          attachment
        });
        const contentType = attachment.type.startsWith("image/") ? "image" : "file";
        setDraft("");
        setAttachment(null);
        await onSend(payload, contentType);
      } else {
        setDraft("");
        await onSend(content, "text");
      }
    } finally {
      setIsSending(false);
    }
  };

  // --- Voice Recording Logic ---

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      isSendingVoiceRef.current = false;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach(track => track.stop());
        
        if (isSendingVoiceRef.current) {
          handleVoiceUpload(audioBlob, recordingTimeRef.current);
        }
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimeRef.current = 0;
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const next = prev + 1;
          recordingTimeRef.current = next;
          if (next >= 300) { // 5 minutes max
            stopRecordingAndSend();
          }
          return next;
        });
      }, 1000);
      
    } catch (err) {
      console.error("Microphone permission denied:", err);
      setUploadError("Microphone access denied.");
      setTimeout(() => setUploadError(""), 3000);
    }
  };

  const stopRecordingAndSend = () => {
    if (mediaRecorderRef.current && isRecording) {
      isSendingVoiceRef.current = true;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      isSendingVoiceRef.current = false;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingTime(0);
      recordingTimeRef.current = 0;
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    }
  };

  const handleVoiceUpload = async (audioBlob: Blob, duration: number) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      const file = new File([audioBlob], "voice_message.webm", { type: "audio/webm" });
      formData.append("file", file);
      
      const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      const token = localStorage.getItem("signal_token");
      
      const res = await fetch(`${API_BASE}/api/upload`, {
        method: "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: formData
      });
      
      if (!res.ok) throw new Error("Voice upload failed");
      
      const attachmentData = await res.json();
      
      const payload = JSON.stringify({
        text: "Voice Message",
        attachment: attachmentData,
        duration: duration
      });
      
      await onSend(payload, "voice");
    } catch (err) {
      console.error(err);
      setUploadError("Failed to send voice message");
      setTimeout(() => setUploadError(""), 3000);
    } finally {
      setIsUploading(false);
      isSendingVoiceRef.current = false;
    }
  };

  const hasDraft = draft.trim().length > 0 || attachment !== null;

  return (
    <footer className="flex items-end gap-1.5 px-3 py-3 bg-signal-sidebar border-t border-signal-border flex-shrink-0 relative">
      {/* Emoji Picker Popover */}
      {showEmojiPicker && !isRecording && (
        <div 
          ref={emojiPickerRef}
          className="absolute bottom-full left-2 mb-2 z-50 shadow-2xl"
          style={{ animation: "authEnter 0.2s ease-out" }}
        >
          <EmojiPicker
            theme={
              settings.theme === "dark" 
                ? Theme.DARK 
                : settings.theme === "light" 
                  ? Theme.LIGHT 
                  : Theme.AUTO
            }
            onEmojiClick={handleEmojiClick}
            previewConfig={{ showPreview: false }}
          />
        </div>
      )}

      {/* Emoji */}
      {!isRecording && (
        <button
          onClick={() => setShowEmojiPicker((prev) => !prev)}
          className="p-2 text-signal-secondary hover:text-signal-primary transition-colors flex-shrink-0 mb-[1px]"
          aria-label="Insert emoji"
          title="Emoji"
        >
          <Smile size={21} />
        </button>
      )}

      {/* Attachment */}
      {!isRecording && (
        <>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
              // Clear input so same file can be selected again
              if (e.target) e.target.value = "";
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="p-2 text-signal-secondary hover:text-signal-primary transition-colors flex-shrink-0 mb-[1px] disabled:opacity-50"
            aria-label="Attach file"
            title="Attach"
          >
            <Paperclip size={21} />
          </button>
        </>
      )}

      {/* Auto-resizing textarea & Previews */}
      {isRecording ? (
        <div className="flex-1 flex items-center justify-between px-4 h-[44px] bg-signal-hover rounded-full">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
            <span className="text-signal-primary text-sm font-medium tabular-nums">
              {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, "0")}
            </span>
          </div>
          <button 
            onClick={cancelRecording}
            className="flex items-center gap-1.5 px-3 py-1.5 text-signal-secondary hover:text-red-400 hover:bg-red-400/10 rounded-full transition-colors text-sm font-medium"
          >
            <Trash2 size={16} />
            Cancel
          </button>
        </div>
      ) : (
        <div className={`flex-1 relative bg-signal-hover rounded-2xl overflow-hidden transition-all border ${isDragOver ? 'border-signal-blue' : 'border-transparent'}`}
           onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
           onDragLeave={() => setIsDragOver(false)}
           onDrop={handleDrop}>
        
        {/* Reply Preview area */}
        {replyingToMessage && (
          <div className="p-3 border-b border-signal-border/50 relative group bg-signal-sidebar/30 flex items-start gap-3">
            <button 
              onClick={onCancelReply}
              className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
              aria-label="Cancel reply"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
            
            <div className="w-1 h-full bg-signal-blue rounded-full absolute left-0 top-0 bottom-0"></div>
            
            <div className="flex-1 min-w-0 pl-1">
              <div className="text-sm font-medium text-signal-blue mb-1 truncate">
                Replying to {replyingToMessage.senderName}
              </div>
              <div className="text-sm text-signal-secondary truncate">
                {replyingToMessage.contentType === "text" 
                  ? replyingToMessage.content
                  : (replyingToMessage.contentType === "image" ? "📷 Image" : (replyingToMessage.contentType === "voice" ? "🎤 Voice Message" : "📎 Attachment"))}
              </div>
            </div>
          </div>
        )}

        {/* Attachment Preview area */}
        {attachment && (
          <div className="p-3 border-b border-signal-border/50 relative group bg-signal-sidebar/30">
            <button 
              onClick={() => setAttachment(null)}
              className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
            {attachment.type.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}${attachment.url}`} 
                   alt={attachment.name} 
                   className="h-24 w-auto object-contain rounded-md" />
            ) : (
              <div className="flex items-center gap-3 bg-signal-sidebar p-3 rounded-lg w-fit">
                <div className="bg-signal-blue/20 p-2 rounded text-signal-blue">
                  <Paperclip size={20} />
                </div>
                <div>
                  <div className="text-sm font-medium text-signal-primary max-w-[200px] truncate">{attachment.name}</div>
                  <div className="text-xs text-signal-secondary">{(attachment.size / 1024).toFixed(1)} KB</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upload Progress/Error */}
        {isUploading && (
          <div className="px-4 py-2 text-xs text-signal-blue animate-pulse">Uploading attachment...</div>
        )}
        {uploadError && (
          <div className="px-4 py-2 text-xs text-red-500">{uploadError}</div>
        )}

        <textarea
          ref={textareaRef}
          value={draft}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={isDragOver ? "Drop file to attach" : "Signal message"}
          rows={1}
          disabled={isSending || isUploading}
          className="
            w-full bg-transparent text-signal-primary
            placeholder-signal-muted text-[14px]
            px-4 py-2.5
            outline-none resize-none overflow-hidden
            leading-[1.5]
            disabled:opacity-60
          "
          aria-label="Message input"
          style={{ maxHeight: "120px", overflowY: "auto" }}
        />
      </div>
      )}

      {/* Send / Mic — toggled by draft content */}
      {hasDraft ? (
        <button
          onClick={handleSend}
          disabled={isSending}
          className="
            p-2 bg-signal-blue hover:bg-signal-blue-hover
            text-white rounded-full flex-shrink-0 mb-[1px]
            transition-colors duration-150
            disabled:opacity-60 disabled:cursor-not-allowed
          "
          aria-label="Send message"
          title="Send"
        >
          <Send size={18} />
        </button>
      ) : isRecording ? (
        <button
          onClick={stopRecordingAndSend}
          disabled={isUploading}
          className="
            p-2 bg-signal-blue hover:bg-signal-blue-hover
            text-white rounded-full flex-shrink-0 mb-[1px]
            transition-colors duration-150
            disabled:opacity-60 disabled:cursor-not-allowed
          "
          aria-label="Send voice message"
          title="Send"
        >
          <Send size={18} />
        </button>
      ) : (
        <button
          onClick={startRecording}
          disabled={isUploading || isSending}
          className="p-2 text-signal-secondary hover:text-signal-primary transition-colors flex-shrink-0 mb-[1px]"
          aria-label="Voice message"
          title="Voice message"
        >
          <Mic size={21} />
        </button>
      )}
    </footer>
  );
}
