import { useState, useEffect } from "react";
import { getModes } from "../api/client.js";
import { formatDuration } from "../api/format.js";

const CITIES_BY_COUNTRY = {
  kenya: [
    { value: "nairobi", label: "Nairobi" }, { value: "mombasa", label: "Mombasa" },
    { value: "kisumu", label: "Kisumu" }, { value: "nakuru", label: "Nakuru" },
    { value: "eldoret", label: "Eldoret" }, { value: "kiambu", label: "Kiambu" },
    { value: "machakos", label: "Machakos" }, { value: "murang'a", label: "Murang'a" },
    { value: "kilifi", label: "Kilifi" }, { value: "meru", label: "Meru" },
    { value: "nyeri", label: "Nyeri" }, { value: "kajiado", label: "Kajiado" },
    { value: "kirinyaga", label: "Kirinyaga" }, { value: "narok", label: "Narok" },
    { value: "embu", label: "Embu" }, { value: "kisii", label: "Kisii" },
    { value: "homa bay", label: "Homa Bay" }, { value: "kericho", label: "Kericho" },
    { value: "nyandarua", label: "Nyandarua" }, { value: "kakamega", label: "Kakamega" },
    { value: "makueni", label: "Makueni" },
  ],
  nigeria: [
    { value: "lagos", label: "Lagos" }, { value: "abuja", label: "Abuja" },
    { value: "kano", label: "Kano" }, { value: "ibadan", label: "Ibadan" },
    { value: "port harcourt", label: "Port Harcourt" }, { value: "enugu", label: "Enugu" },
  ],
};

const COUNTRY_META = {
  kenya:   { flag: "🇰🇪", label: "Kenya" },
  nigeria: { flag: "🇳🇬", label: "Nigeria" },
};

const CITY_PLACEHOLDERS = {
  nairobi:       { origin: "e.g. Kasarani",      destination: "e.g. CBD" },
  lagos:         { origin: "e.g. Ikeja",          destination: "e.g. Victoria Island" },
  abuja:         { origin: "e.g. Wuse",           destination: "e.g. Garki" },
  kano:          { origin: "e.g. Nassarawa GRA",  destination: "e.g. Kano City" },
};
const DEFAULT_PLACEHOLDER = { origin: "e.g. downtown", destination: "e.g. city center" };

export default function RouteSearchForm({
  city, onCityChange, onSearch, isLoading,
  options, selectedMode, onSelectMode,
}) {
  const [country, setCountry]         = useState("kenya");
  const [origin, setOrigin]           = useState("");
  const [destination, setDestination] = useState("");
  const [time, setTime]               = useState("");
  const [modes, setModes]             = useState([]);
  const [modesLoading, setModesLoading] = useState(true);
  const [modesError, setModesError]   = useState(null);

  const placeholders = CITY_PLACEHOLDERS[city] ?? DEFAULT_PLACEHOLDER;

  useEffect(() => {
    let cancelled = false;
    setModesLoading(true);
    setModesError(null);
    getModes(city)
      .then((data) => { if (!cancelled) setModes(data.modes ?? []); })
      .catch((err) => {
        console.error("Couldn't load modes for", city, err);
        if (!cancelled) { setModes([]); setModesError(err.message); }
      })
      .finally(() => { if (!cancelled) setModesLoading(false); });
    return () => { cancelled = true; };
  }, [city]);

  function handleCountryClick(newCountry) {
    setCountry(newCountry);
    onCityChange(CITIES_BY_COUNTRY[newCountry][0].value);
    setOrigin("");
    setDestination("");
  }

  function handleCitySelect(e) {
    onCityChange(e.target.value);
    setOrigin("");
    setDestination("");
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!origin.trim() || !destination.trim() || modes.length === 0) return;
    onSearch({
      origin:      origin.trim(),
      destination: destination.trim(),
      time,
      city,
      modes: modes.map((m) => m.key),
    });
  }

  // FIX 1: Button text was inverted — isLoading showed "Get Recommendations"
  // (the idle label) instead of a loading indicator.
  function buttonLabel() {
    if (isLoading)     return "Fetching…";
    if (modesLoading)  return "Loading transport options…";
    return "Fetch recommendations";
  }

  return (
    <form className="search-form" onSubmit={handleSubmit}>

      <div className="field">
        <label>Country</label>
        <div className="mode-group" role="group" aria-label="Country">
          {Object.entries(COUNTRY_META).map(([key, meta]) => (
            <button
              type="button" key={key}
              className={`mode-pill ${country === key ? "active" : ""}`}
              onClick={() => handleCountryClick(key)}
              aria-pressed={country === key}
            >
              {meta.flag} {meta.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="city">City</label>
        <select id="city" value={city} onChange={handleCitySelect}>
          {CITIES_BY_COUNTRY[country].map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="origin">From</label>
        <input
          id="origin" value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          placeholder={placeholders.origin} required
        />
      </div>

      <div className="field">
        <label htmlFor="destination">To</label>
        <input
          id="destination" value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder={placeholders.destination} required
        />
      </div>

      <div className="field">
        <label>Mode {modesLoading && <span className="modes-loading-hint">(loading…)</span>}</label>
        <div className="mode-group" role="group" aria-label="Transport mode">

          {/* FIX 2: Show skeleton pills while modes are loading so the layout
              doesn't jump when they arrive */}
          {modesLoading && (
            <>
              {[1,2,3,4].map((i) => (
                <span key={i} className="mode-pill skeleton-pill">Loading</span>
              ))}
            </>
          )}

          {!modesLoading && modes.map((m) => {
            const liveResult = options?.find((o) => o.mode === m.key);
            const isSelected = selectedMode === m.key;

            // FIX 3: Don't show "0 min" — if travel time is 0 or missing,
            // only show the mode label and emoji, not a broken time.
            const showTime = liveResult && liveResult.travel_time_min > 0;

            return (
              <button
                type="button" key={m.key}
                className={`mode-pill ${isSelected ? "active" : ""}`}
                onClick={() => liveResult && onSelectMode(m.key)}
                // Visually disable the pill until results are available
                style={{ opacity: liveResult ? 1 : 0.6 }}
                title={liveResult ? undefined : "Run a search first to see this mode's time"}
              >
                {m.emoji} {m.label}
                {showTime && (
                  <> · {formatDuration(liveResult.travel_time_min)} {liveResult.quality_emoji}</>
                )}
              </button>
            );
          })}
        </div>
        {modesError && (
          <p className="form-status error">Couldn't load transport modes: {modesError}</p>
        )}
      </div>

      <div className="field">
        <label htmlFor="time">Departure time (optional)</label>
        <input
          id="time" type="time" value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </div>

      <button
        type="submit" className="btn-primary"
        disabled={isLoading || modesLoading || modes.length === 0}
      >
        {buttonLabel()}
      </button>
    </form>
  );
}
