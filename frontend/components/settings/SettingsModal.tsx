"use client";

import { useState, useRef, useEffect } from "react";
import { 
  X, User, Monitor, Shield, Bell, Info, 
  Upload, LogOut, Check, Trash2
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings, type ThemeType } from "@/contexts/SettingsContext";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = "account" | "appearance" | "privacy" | "notifications" | "about" | "developer";

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState<TabType>("account");
  const [isClosing, setIsClosing] = useState(false);
  const [shouldRender, setShouldRender] = useState(isOpen);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Sync isOpen to shouldRender for enter/exit animations
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
      previousFocusRef.current = document.activeElement as HTMLElement;
    } else if (shouldRender) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
        if (previousFocusRef.current) {
          previousFocusRef.current.focus();
        }
      }, 200); // match duration-200
      return () => clearTimeout(timer);
    }
  }, [isOpen, shouldRender]);

  // Handle body scroll and escape key
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

  // Focus trap
  useEffect(() => {
    if (!shouldRender || !modalRef.current) return;
    
    const focusableElements = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    // Auto focus first element (e.g. Account tab)
    if (firstElement && !isClosing) {
      // Small timeout to allow animation to start before focusing, preventing scroll jumps
      setTimeout(() => firstElement.focus(), 10);
    }

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [shouldRender, isClosing]);

  if (!shouldRender) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-all duration-200 ${
        isClosing ? "opacity-0" : "opacity-100"
      }`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      <div 
        ref={modalRef}
        className={`w-[95%] max-w-[800px] h-[600px] max-h-[90vh] bg-signal-sidebar rounded-xl shadow-2xl flex overflow-hidden border border-signal-border transition-all duration-200 ${
          isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar */}
        <div className="w-[240px] bg-signal-sidebar-header border-r border-signal-border flex flex-col">
          <div className="h-[60px] flex items-center px-4 font-semibold text-signal-primary text-lg">
            Settings
          </div>
          <nav className="flex-1 overflow-y-auto py-2">
            <TabButton icon={<User size={18} />} label="Account" isActive={activeTab === "account"} onClick={() => setActiveTab("account")} />
            <TabButton icon={<Monitor size={18} />} label="Appearance" isActive={activeTab === "appearance"} onClick={() => setActiveTab("appearance")} />
            <TabButton icon={<Shield size={18} />} label="Privacy" isActive={activeTab === "privacy"} onClick={() => setActiveTab("privacy")} />
            <TabButton icon={<Bell size={18} />} label="Notifications" isActive={activeTab === "notifications"} onClick={() => setActiveTab("notifications")} />
            <TabButton icon={<Info size={18} />} label="About" isActive={activeTab === "about"} onClick={() => setActiveTab("about")} />
            {settings.developerMode && (
              <TabButton icon={<Monitor size={18} />} label="Developer" isActive={activeTab === "developer"} onClick={() => setActiveTab("developer")} />
            )}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col bg-signal-sidebar relative">
          <button 
            className="absolute top-4 right-4 p-2 text-signal-secondary hover:text-signal-primary hover:bg-signal-hover rounded-full transition-colors"
            onClick={onClose}
            aria-label="Close settings"
          >
            <X size={20} />
          </button>
          
          <div className="flex-1 overflow-y-auto p-8">
            {activeTab === "account" && <AccountTab />}
            {activeTab === "appearance" && <AppearanceTab />}
            {activeTab === "privacy" && <PrivacyTab />}
            {activeTab === "notifications" && <NotificationsTab />}
            {activeTab === "about" && <AboutTab />}
            {activeTab === "developer" && <DeveloperTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({ icon, label, isActive, onClick }: { icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors
        ${isActive ? "bg-signal-hover text-signal-primary font-medium" : "text-signal-secondary hover:bg-signal-hover/50 hover:text-signal-primary"}
      `}
    >
      {icon}
      {label}
    </button>
  );
}

// ----------------------------------------------------------------------
// TABS
// ----------------------------------------------------------------------

function AccountTab() {
  const { user, updateProfile, logout } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const hasChanges = displayName !== (user?.display_name || "");

  const handleSaveProfile = async () => {
    if (!hasChanges) return;
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError("");
    try {
      await updateProfile({ display_name: displayName });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error(err);
      setSaveError("Failed to update profile");
      setTimeout(() => setSaveError(""), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setSaveError("Please select an image file.");
      setTimeout(() => setSaveError(""), 3000);
      return;
    }
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const url = ev.target?.result as string;
      try {
        await updateProfile({ avatar_url: url });
      } catch (err) {
        console.error(err);
        setSaveError("Failed to update avatar");
        setTimeout(() => setSaveError(""), 3000);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleRemovePhoto = async () => {
    setIsUploading(true);
    try {
      await updateProfile({ avatar_url: "" });
    } catch (err) {
      console.error(err);
      setSaveError("Failed to remove avatar");
      setTimeout(() => setSaveError(""), 3000);
    } finally {
      setIsUploading(false);
    }
  };

  const handleChangePassword = () => {
    setPasswordSuccess(true);
    setTimeout(() => setPasswordSuccess(false), 2000);
  };

  return (
    <div className="max-w-md animate-in fade-in slide-in-from-right-4 duration-300">
      <h2 className="text-xl font-semibold text-signal-primary mb-6">Account</h2>
      
      <div className="mb-8 flex items-center gap-6">
        <div 
          className={`relative w-20 h-20 rounded-full bg-signal-hover overflow-hidden border-2 flex-shrink-0 transition-colors ${
            isDragging ? "border-signal-blue border-dashed" : "border-signal-border"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {isUploading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
          {user?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white bg-signal-blue">
              {user?.display_name?.charAt(0).toUpperCase() || "U"}
            </div>
          )}
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="flex gap-2">
            <button 
              onClick={() => fileRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-2 px-3 py-1.5 bg-signal-hover hover:bg-signal-active text-signal-primary text-sm font-medium rounded-lg transition-colors disabled:opacity-50 active:scale-[0.98]"
            >
              <Upload size={16} />
              Change Photo
            </button>
            {user?.avatar_url && (
              <button 
                onClick={handleRemovePhoto}
                disabled={isUploading}
                className="flex items-center gap-2 px-3 py-1.5 bg-signal-hover hover:bg-red-400/10 text-red-400 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 active:scale-[0.98]"
                aria-label="Remove Photo"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
          <p className="text-xs text-signal-muted mt-2">Drag and drop an image or click to browse.</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-signal-secondary mb-1">Display Name</label>
          <input 
            type="text" 
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-3 py-2 bg-signal-chat border border-signal-border rounded-lg text-signal-primary outline-none focus:border-signal-blue transition-colors"
          />
          <div className="mt-3 flex items-center gap-3 h-8">
            <button 
              onClick={handleSaveProfile}
              disabled={isSaving || !hasChanges}
              className="px-4 py-2 bg-signal-blue hover:bg-signal-blue-hover disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors active:scale-[0.98] flex items-center justify-center min-w-[100px]"
            >
              {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Save Profile"}
            </button>
            {saveSuccess && <span className="text-signal-online text-sm flex items-center gap-1 animate-in fade-in duration-200"><Check size={14} /> Saved</span>}
            {saveError && <span className="text-red-400 text-sm flex items-center gap-1 animate-in fade-in duration-200">{saveError}</span>}
          </div>
        </div>

        <hr className="border-signal-border" />

        <div>
          <h3 className="text-sm font-medium text-signal-primary mb-3">Password</h3>
          <p className="text-sm text-signal-secondary mb-3">Change your account password. (Simulated in this demo)</p>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleChangePassword}
              className="px-4 py-2 bg-signal-hover hover:bg-signal-active text-signal-primary text-sm font-medium rounded-lg transition-colors"
            >
              Change Password
            </button>
            {passwordSuccess && <span className="text-signal-online text-sm flex items-center gap-1"><Check size={14} /> Success</span>}
          </div>
        </div>

        <hr className="border-signal-border" />

        <div>
          <h3 className="text-sm font-medium text-red-400 mb-3">Danger Zone</h3>
          <button 
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 text-red-400 bg-red-400/10 hover:bg-red-400/20 text-sm font-medium rounded-lg transition-colors"
          >
            <LogOut size={16} />
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}

function AppearanceTab() {
  const { settings, updateSetting } = useSettings();

  const themes: { id: ThemeType; label: string; desc: string }[] = [
    { id: "system", label: "System Default", desc: "Follows your operating system's setting" },
    { id: "light", label: "Light", desc: "Light theme for bright environments" },
    { id: "dark", label: "Dark", desc: "Dark theme for low-light environments" },
  ];

  return (
    <div className="max-w-md animate-in fade-in slide-in-from-right-4 duration-300">
      <h2 className="text-xl font-semibold text-signal-primary mb-6">Appearance</h2>
      
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-signal-secondary uppercase tracking-wider">Theme</h3>
        <div className="space-y-2">
          {themes.map((t) => (
            <label key={t.id} className="flex items-start gap-3 p-3 rounded-lg border border-signal-border bg-signal-chat cursor-pointer hover:border-signal-blue transition-colors">
              <div className="pt-0.5">
                <input 
                  type="radio" 
                  name="theme" 
                  value={t.id} 
                  checked={settings.theme === t.id}
                  onChange={() => updateSetting("theme", t.id)}
                  className="w-4 h-4 text-signal-blue bg-signal-hover border-signal-border focus:ring-signal-blue focus:ring-2"
                />
              </div>
              <div>
                <div className="text-sm font-medium text-signal-primary">{t.label}</div>
                <div className="text-xs text-signal-secondary mt-0.5">{t.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <hr className="border-signal-border my-6" />
      
      <div className="space-y-6">
        <h3 className="text-sm font-medium text-signal-secondary uppercase tracking-wider">Voice Messages</h3>
        
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-signal-primary">Default Playback Speed</div>
            <div className="text-sm text-signal-secondary mt-0.5">Speed for playing voice messages.</div>
          </div>
          <select
            value={settings.voiceMessagePlaybackSpeed}
            onChange={(e) => updateSetting("voiceMessagePlaybackSpeed", parseFloat(e.target.value))}
            className="px-3 py-1.5 bg-signal-hover border border-signal-border rounded-lg text-signal-primary outline-none focus:border-signal-blue transition-colors text-sm"
          >
            <option value={1}>1x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2x</option>
          </select>
        </div>

        <ToggleRow 
          label="Auto-Play Next" 
          description="Automatically play the next voice message."
          checked={settings.autoPlayVoiceMessages}
          onChange={(v) => updateSetting("autoPlayVoiceMessages", v)}
        />
      </div>
    </div>
  );
}

function PrivacyTab() {
  const { settings, updateSetting } = useSettings();

  return (
    <div className="max-w-md animate-in fade-in slide-in-from-right-4 duration-300">
      <h2 className="text-xl font-semibold text-signal-primary mb-6">Privacy</h2>
      
      <div className="space-y-6">
        <ToggleRow 
          label="Read Receipts" 
          description="If read receipts are disabled, you won't be able to see read receipts from others."
          checked={settings.readReceipts}
          onChange={(v) => updateSetting("readReceipts", v)}
        />
        <hr className="border-signal-border" />
        <ToggleRow 
          label="Typing Indicators" 
          description="If typing indicators are disabled, you won't be able to see typing indicators from others."
          checked={settings.typingIndicators}
          onChange={(v) => updateSetting("typingIndicators", v)}
        />
        <hr className="border-signal-border" />
        <ToggleRow 
          label="Last Seen" 
          description="Show others when you were last online."
          checked={settings.lastSeen}
          onChange={(v) => updateSetting("lastSeen", v)}
        />
      </div>
    </div>
  );
}

function NotificationsTab() {
  const { settings, updateSetting } = useSettings();

  const handleNotificationsToggle = async (v: boolean) => {
    if (v) {
      // Trying to enable notifications
      if (!("Notification" in window)) {
        alert("This browser does not support desktop notifications.");
        return;
      }
      
      let permission = Notification.permission;
      if (permission === "default") {
        permission = await Notification.requestPermission();
      }
      
      if (permission === "granted") {
        updateSetting("browserNotifications", true);
      } else {
        // Denied
        alert("Notification permission was denied. Please enable it in your browser settings to use this feature.");
        updateSetting("browserNotifications", false);
      }
    } else {
      // Disabling notifications
      updateSetting("browserNotifications", false);
    }
  };

  return (
    <div className="max-w-md animate-in fade-in slide-in-from-right-4 duration-300">
      <h2 className="text-xl font-semibold text-signal-primary mb-6">Notifications</h2>
      
      <div className="space-y-6">
        <ToggleRow 
          label="Browser Notifications" 
          description="Show popup notifications for new messages when Signal is in the background."
          checked={settings.browserNotifications}
          onChange={handleNotificationsToggle}
        />
        <hr className="border-signal-border" />
        <ToggleRow 
          label="Notification Sounds" 
          description="Play a sound when a new message arrives."
          checked={settings.notificationSounds}
          onChange={(v) => updateSetting("notificationSounds", v)}
        />
      </div>
    </div>
  );
}

function AboutTab() {
  const { settings, updateSetting } = useSettings();

  return (
    <div className="max-w-md animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col items-center text-center mt-8 mx-auto">
      <svg
        width="80"
        height="80"
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="mb-4 drop-shadow-md"
      >
        <circle cx="22" cy="22" r="22" fill="#2C6BED" />
        <path
          d="M22 8C14.268 8 8 14.268 8 22c0 2.386.607 4.631 1.677 6.588L8 36l7.617-1.643A13.916 13.916 0 0022 36c7.732 0 14-6.268 14-14S29.732 8 22 8z"
          fill="white"
        />
      </svg>
      
      <h2 className="text-2xl font-bold text-signal-primary">Signal Clone</h2>
      <p className="text-signal-secondary mt-1 font-medium">Version 1.0.0</p>
      
      <div className="mt-8 p-4 bg-signal-chat border border-signal-border rounded-xl text-sm text-signal-primary w-full text-left space-y-3">
        <h3 className="font-semibold text-signal-secondary uppercase text-xs tracking-wider">Tech Stack</h3>
        <ul className="space-y-1 text-signal-muted">
          <li><span className="text-signal-primary font-medium">Frontend:</span> Next.js 15, Tailwind v4, TypeScript</li>
          <li><span className="text-signal-primary font-medium">Backend:</span> FastAPI, SQLAlchemy, SQLite</li>
          <li><span className="text-signal-primary font-medium">Real-time:</span> WebSockets (asyncio)</li>
        </ul>
      </div>

      <div className="mt-8 text-sm text-signal-muted space-y-3 w-full text-left">
        <p className="text-center">Built with ❤️ by Aryan.</p>
        <p className="text-center">
          <a href="https://github.com/aryannnnnzzz/signal-clone" target="_blank" rel="noopener noreferrer" className="text-signal-blue hover:underline hover:text-signal-blue-hover transition-colors">
            GitHub Repository
          </a>
        </p>
        
        <div className="pt-6">
          <hr className="border-signal-border mb-6" />
          <ToggleRow 
            label="Developer Mode" 
            description="Enable advanced developer settings."
            checked={settings.developerMode}
            onChange={(v) => updateSetting("developerMode", v)}
          />
        </div>
      </div>
    </div>
  );
}

function DeveloperTab() {
  const handleClearStorage = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <div className="max-w-md animate-in fade-in slide-in-from-right-4 duration-300">
      <h2 className="text-xl font-semibold text-signal-primary mb-6">Developer</h2>
      
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium text-signal-primary mb-3">Clear Local Storage</h3>
          <p className="text-sm text-signal-secondary mb-3">Clear all cached application state. You will need to log in again.</p>
          <button 
            onClick={handleClearStorage}
            className="px-4 py-2 bg-signal-hover hover:bg-signal-active text-signal-primary text-sm font-medium rounded-lg transition-colors"
          >
            Clear Local Storage
          </button>
        </div>

        <hr className="border-signal-border" />

        <div>
          <h3 className="text-sm font-medium text-red-400 mb-3">Reset Database</h3>
          <p className="text-sm text-signal-secondary mb-3">Wipe all data from the database. (Simulated)</p>
          <button 
            onClick={() => alert("Database reset simulated.")}
            className="flex items-center gap-2 px-4 py-2 text-red-400 bg-red-400/10 hover:bg-red-400/20 text-sm font-medium rounded-lg transition-colors"
          >
            <Trash2 size={16} />
            Reset Database
          </button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// COMPONENTS
// ----------------------------------------------------------------------

function ToggleRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-sm font-medium text-signal-primary">{label}</div>
        <div className="text-sm text-signal-secondary mt-0.5">{description}</div>
      </div>
      <button 
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          checked ? 'bg-signal-blue' : 'bg-signal-border'
        }`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
