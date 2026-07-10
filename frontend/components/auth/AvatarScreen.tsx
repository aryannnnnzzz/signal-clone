"use client";

import { useState, useRef, type ChangeEvent } from "react";
import AuthContainer from "./AuthContainer";
import AuthBackButton from "./AuthBackButton";

interface AvatarScreenProps {
  onComplete: (avatarUrl: string | undefined) => void;
  onBack: () => void;
  onSkip: () => void;
}

/** Pre-selected colour swatches for the generated avatar background */
const AVATAR_COLORS = [
  "#2c6bed", // Signal blue
  "#e05d44", // Red-orange
  "#5c6bc0", // Indigo
  "#26a69a", // Teal
  "#ef6c00", // Orange
  "#8e24aa", // Purple
  "#00897b", // Green-teal
  "#c0392b", // Crimson
];

/**
 * Avatar selection / upload screen — the final step of onboarding.
 *
 * Two options:
 *  1. Pick a colour and use an auto-generated initial avatar.
 *  2. Upload a custom photo (reads as data-URL; no network call).
 *
 * Calling `onComplete` with the chosen value finishes auth.
 * Calling `onSkip` finishes auth with no avatar.
 */
export default function AvatarScreen({
  onComplete,
  onBack,
  onSkip,
}: AvatarScreenProps) {
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /* ── File handling ────────────────────────────────── */
  function processFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setUploadedUrl(url);
    };
    reader.readAsDataURL(file);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    processFile(e.target.files?.[0]);
    // Reset so the same file can be re-selected
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    processFile(e.dataTransfer.files?.[0]);
  }

  function handleRemoveUpload() {
    setUploadedUrl(null);
  }

  function handleDone() {
    onComplete(uploadedUrl ?? undefined);
  }

  /* ── Preview ──────────────────────────────────────── */
  const initials = "A"; // placeholder; real app uses displayName from previous step

  return (
    <AuthContainer>
      <AuthBackButton onClick={onBack} />

      {/* ── Header ────────────────────────────────────── */}
      <div className="text-center mb-8">
        <h1 className="text-[22px] font-bold text-signal-primary">
          Add a Profile Photo
        </h1>
        <p className="text-signal-secondary text-[14px] mt-1">
          Help others recognise you. You can change this later.
        </p>
      </div>

      {/* ── Avatar preview ────────────────────────────── */}
      <div className="flex justify-center mb-6">
        <div
          className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-signal-border cursor-pointer group"
          onClick={() => fileRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          role="button"
          aria-label="Upload profile photo"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") fileRef.current?.click();
          }}
        >
          {uploadedUrl ? (
            /* Custom uploaded photo */
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={uploadedUrl}
              alt="Your profile photo"
              className="w-full h-full object-cover"
            />
          ) : (
            /* Colour + initial avatar */
            <div
              className="w-full h-full flex items-center justify-center text-[40px] font-bold text-white select-none"
              style={{ backgroundColor: selectedColor }}
            >
              {initials}
            </div>
          )}

          {/* Hover overlay */}
          <div
            className={`
              absolute inset-0 flex flex-col items-center justify-center gap-1
              bg-black/50 transition-opacity duration-150
              ${isDragOver ? "opacity-100" : "opacity-0 group-hover:opacity-100"}
            `}
            aria-hidden="true"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span className="text-white text-[11px] font-medium">
              {isDragOver ? "Drop here" : "Change"}
            </span>
          </div>
        </div>

        {/* Remove button shown when a photo is uploaded */}
        {uploadedUrl && (
          <button
            onClick={handleRemoveUpload}
            className="absolute mt-[92px] ml-20 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-[14px] leading-none hover:bg-red-600 transition-colors"
            aria-label="Remove photo"
          >
            ×
          </button>
        )}
      </div>

      {/* ── Colour swatches (shown when no photo uploaded) ── */}
      {!uploadedUrl && (
        <div className="flex justify-center gap-2.5 mb-6" role="group" aria-label="Avatar background colour">
          {AVATAR_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => setSelectedColor(color)}
              className={`
                w-7 h-7 rounded-full transition-all duration-150
                ${selectedColor === color
                  ? "ring-2 ring-offset-2 ring-offset-signal-chat ring-white scale-110"
                  : "hover:scale-105 opacity-75 hover:opacity-100"}
              `}
              style={{ backgroundColor: color }}
              aria-label={`Select colour ${color}`}
              aria-pressed={selectedColor === color}
            />
          ))}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileRef}
        id="avatar-file-input"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        aria-hidden="true"
      />

      {/* ── Upload button ──────────────────────────────── */}
      {!uploadedUrl && (
        <button
          id="avatar-upload-btn"
          onClick={() => fileRef.current?.click()}
          className="w-full mb-3 py-3 rounded-[10px] border border-signal-border text-signal-primary font-medium text-[15px] hover:bg-signal-hover active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Upload a Photo
        </button>
      )}

      {/* ── Done / Skip ───────────────────────────────── */}
      <button
        id="avatar-done-btn"
        onClick={handleDone}
        className="w-full py-3 rounded-[10px] bg-signal-blue text-white font-semibold text-[15px] hover:bg-signal-blue-hover active:scale-[0.98] transition-all duration-150"
      >
        Done
      </button>

      <button
        id="avatar-skip-btn"
        onClick={onSkip}
        className="w-full mt-2 py-2 text-signal-muted text-[13px] hover:text-signal-secondary transition-colors"
      >
        Skip for now
      </button>
    </AuthContainer>
  );
}
