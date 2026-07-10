import { Search, X } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Conversation search input.
 * Filters conversations by name and last-message content in the parent Sidebar.
 * Shows a clear (×) button when the field has a value.
 */
export default function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="px-3 py-2.5 flex-shrink-0">
      <div className="relative flex items-center">
        <Search
          size={14}
          className="absolute left-3 text-signal-muted pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="search"
          placeholder="Search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="
            w-full bg-signal-hover text-signal-primary placeholder-signal-muted
            text-[13px] rounded-full pl-8 pr-8 py-2
            outline-none focus:ring-1 focus:ring-signal-blue/40
            transition-shadow duration-150
          "
          aria-label="Search conversations"
        />
        {value && (
          <button
            onClick={() => onChange("")}
            className="absolute right-3 text-signal-muted hover:text-signal-primary transition-colors"
            aria-label="Clear search"
          >
            <X size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
