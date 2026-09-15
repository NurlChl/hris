import React, { useState, useEffect, useRef } from "react";

interface SearchSelectProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
  disabled?: boolean;
}

export default function SearchSelect({ 
  label, 
  value, 
  onChange, 
  options, 
  placeholder = "Pilih...", 
  disabled = false 
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const clickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, []);

  const filtered = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOpt = options.find(opt => opt.value === value);

  return (
    <div className="space-y-1 relative w-full" ref={dropdownRef}>
      <label className="font-semibold text-foreground block mb-1 text-[11px]">{label}</label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-surface border border-line text-foreground dark:text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary text-left min-h-[34px] disabled:opacity-50 cursor-pointer"
      >
        <span className="truncate">{selectedOpt ? selectedOpt.label : placeholder}</span>
        <span className="text-[11px] text-subtle">▼</span>
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-surface border border-line rounded-lg shadow-[var(--shadow-pop)] p-1.5 space-y-1.5 max-h-56 overflow-hidden flex flex-col">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari..."
            className="w-full px-2.5 py-1.5 rounded bg-surface-2 border border-line text-xs text-foreground dark:text-foreground focus:outline-none placeholder:text-subtle"
          />
          <div className="space-y-0.5 overflow-y-auto max-h-40">
            {filtered.length === 0 ? (
              <div className="p-2 text-subtle text-center text-[11px]">Tidak ditemukan</div>
            ) : (
              filtered.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-all cursor-pointer ${
                    opt.value === value 
                      ? "bg-primary text-primary-foreground font-semibold" 
                      : "hover:bg-surface-2 text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
