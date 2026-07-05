"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { MapPin, Loader2, X, CheckCircle2 } from "lucide-react";

// ─── Vermont bounding box (biases results toward VT, doesn't restrict) ────────
const VT_SW = { lat: 42.7268, lng: -73.4379 };
const VT_NE = { lat: 45.0167, lng: -71.4645 };

// ─── Local types (mirrors google.maps.places.AutocompletePrediction) ─────────
interface Prediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

// ─── Configure the Maps API (safe to call multiple times — idempotent) ───────
function ensureMapsConfigured() {
  setOptions({
    key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    v: "weekly",
  });
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface AddressAutocompleteProps {
  /** The currently confirmed address value (controlled) */
  value: string;
  /** Called when the user selects a prediction — receives the full address string */
  onChange: (address: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AddressAutocomplete({
  value,
  onChange,
}: AddressAutocompleteProps) {
  // What's displayed in the text box (may differ from confirmed `value` while typing)
  const [inputValue, setInputValue] = useState(value);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  // true only when the current inputValue was chosen from the dropdown
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const serviceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Portal target for the dropdown so it can escape overflow-hidden ancestors
  // (dashboards, modals, drawers). Recomputed on scroll/resize while open.
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const updateDropdownPos = useCallback(() => {
    if (!inputRef.current) return;
    const r = inputRef.current.getBoundingClientRect();
    setDropdownPos({ top: r.bottom + 6, left: r.left, width: r.width });
  }, []);
  useEffect(() => {
    if (!isOpen) return;
    updateDropdownPos();
    const handler = () => updateDropdownPos();
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, [isOpen, predictions, updateDropdownPos]);

  // ── Load Google Maps Places once ─────────────────────────────────────────
  useEffect(() => {
    console.log("[AddressAutocomplete] Initializing Maps with key:", process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? "Present" : "MISSING");
    ensureMapsConfigured();
    importLibrary("places")
      .then(({ AutocompleteService }) => {
        console.log("[AddressAutocomplete] Places library loaded successfully");
        serviceRef.current = new AutocompleteService();
        setIsReady(true);
      })
      .catch((err) => {
        console.error("[AddressAutocomplete] Maps failed to load:", err);
        // Alert if it's a specific developer error
        if (err instanceof Error) {
          console.error("[AddressAutocomplete] Error name:", err.name, "Message:", err.message);
        }
      });
  }, []);

  // ── Close dropdown when clicking outside ─────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Query Places API ─────────────────────────────────────────────────────
  const fetchPredictions = useCallback((query: string) => {
    if (!serviceRef.current || query.trim().length < 3) {
      setPredictions([]);
      setIsOpen(false);
      return;
    }

    setIsSearching(true);
    console.log("[AddressAutocomplete] Fetching predictions for:", query);

    serviceRef.current.getPlacePredictions(
      {
        input: query,
        componentRestrictions: { country: "us" },
        types: ["address"],
        // LatLngBoundsLiteral — biases results toward Vermont
        bounds: {
          north: VT_NE.lat,
          south: VT_SW.lat,
          east: VT_NE.lng,
          west: VT_SW.lng,
        },
      },
      (results, status) => {
        setIsSearching(false);
        console.log("[AddressAutocomplete] Status:", status, "Results count:", results?.length || 0);

        if (
          status === window.google.maps.places.PlacesServiceStatus.OK &&
          results
        ) {
          setPredictions(results as unknown as Prediction[]);
          setIsOpen(true);
        } else {
          setPredictions([]);
          setIsOpen(false);
        }
      }
    );
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInputValue(v);
    setIsConfirmed(false);
    // Clear the confirmed value upstream while the user is retyping
    if (v !== value) onChange("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPredictions(v), 380);
  };

  const handleSelect = (p: Prediction) => {
    setInputValue(p.description);
    onChange(p.description);
    setIsConfirmed(true);
    setIsOpen(false);
    setPredictions([]);
  };

  const handleClear = () => {
    setInputValue("");
    onChange("");
    setIsConfirmed(false);
    setPredictions([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="relative">
      {/* Input */}
      <div className="relative">
        {isConfirmed ? (
          <CheckCircle2
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none"
          />
        ) : (
          <MapPin
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
          />
        )}

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleChange}
          onFocus={() =>
            !isConfirmed && predictions.length > 0 && setIsOpen(true)
          }
          placeholder={
            isReady ? "123 Main St, Burlington, VT" : "Loading map data…"
          }
          disabled={!isReady}
          autoComplete="street-address"
          spellCheck={false}
          className={`w-full text-center bg-[#1a1a1a] border rounded-xl pl-9 pr-9 py-3 text-[16px] md:text-sm text-white placeholder-zinc-700 focus:outline-none transition-colors disabled:opacity-40 ${
            isConfirmed
              ? "border-emerald-500/50 focus:border-emerald-500/70"
              : "border-[#252525] focus:border-zinc-500"
          }`}
        />

        {/* Right icon: spinner while fetching, ✕ to clear, nothing otherwise */}
        {isSearching ? (
          <Loader2
            size={14}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 animate-spin pointer-events-none"
          />
        ) : inputValue ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors"
            tabIndex={-1}
            aria-label="Clear address"
          >
            <X size={13} />
          </button>
        ) : null}
      </div>

      {/* Dropdown — portaled to document.body so it escapes overflow-hidden
          modal ancestors. Fixed-positioned, max-height with internal scroll,
          shows all predictions Google returns (up to 5). */}
      {isOpen && predictions.length > 0 && dropdownPos && typeof window !== "undefined" && createPortal(
        <div
          style={{
            position: "fixed",
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: dropdownPos.width,
            maxHeight: "min(320px, 60vh)",
            zIndex: 10000,
          }}
          className="bg-[#181818] border border-[#252525] rounded-xl overflow-y-auto shadow-2xl shadow-black/70"
          onMouseDown={(e) => {
            // Prevent the outside-click handler from closing us when clicking
            // inside the dropdown (which is now outside containerRef).
            e.stopPropagation();
          }}
        >
          {predictions.slice(0, 5).map((p, i) => (
            <button
              key={p.place_id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(p);
              }}
              className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-[#222] transition-colors ${
                i < Math.min(predictions.length, 5) - 1 ? "border-b border-[#2a2a2a]" : ""
              }`}
            >
              <MapPin size={13} className="text-zinc-500 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white leading-snug break-words">
                  {p.structured_formatting.main_text}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5 leading-snug break-words">
                  {p.structured_formatting.secondary_text}
                </p>
              </div>
            </button>
          ))}
          <div className="flex justify-end items-center px-4 py-2 bg-[#111] border-t border-[#2a2a2a] sticky bottom-0">
            <span className="text-[9px] text-zinc-600 tracking-widest uppercase">Powered by Google</span>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
