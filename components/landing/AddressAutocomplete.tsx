"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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

  // ── Load Google Maps Places once ─────────────────────────────────────────
  useEffect(() => {
    ensureMapsConfigured();
    importLibrary("places")
      .then(({ AutocompleteService }) => {
        serviceRef.current = new AutocompleteService();
        setIsReady(true);
      })
      .catch((err) =>
        console.error("[AddressAutocomplete] Maps failed to load:", err)
      );
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
          autoComplete="off"
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

      {/* Dropdown */}
      {isOpen && predictions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-[70] mt-1.5 bg-[#181818] border border-[#252525] rounded-xl overflow-hidden shadow-2xl shadow-black/70">
          {predictions.slice(0, 5).map((p, i) => (
            <button
              key={p.place_id}
              type="button"
              // onMouseDown + preventDefault prevents the input from blurring
              // before the click fires, which would close the dropdown first
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(p);
              }}
              className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-[#222] transition-colors ${
                i < Math.min(predictions.length, 5) - 1
                  ? "border-b border-[#2a2a2a]"
                  : ""
              }`}
            >
              <MapPin size={13} className="text-zinc-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate leading-snug">
                  {p.structured_formatting.main_text}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5 truncate">
                  {p.structured_formatting.secondary_text}
                </p>
              </div>
            </button>
          ))}

          {/* Required by Google Maps Platform Terms of Service */}
          <div className="flex justify-end items-center px-4 py-2 bg-[#111] border-t border-[#2a2a2a]">
            <span className="text-[9px] text-zinc-600 tracking-widest uppercase">
              Powered by Google
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
