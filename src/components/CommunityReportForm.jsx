import { useState, useEffect, useRef } from "react";
import { submitReport, geocodeForMap } from "../api/client.js";

const REPORT_TYPES = [
  { value: "accident",      label: "Accident" },
  { value: "flood",         label: "Flood" },
  { value: "road_closure",  label: "Road closure" },
  { value: "heavy_traffic", label: "Heavy traffic" },
  { value: "construction",  label: "Construction" },
  { value: "breakdown",     label: "Breakdown" },
];

export default function CommunityReportForm({ city, onReportSubmitted }) {
  const [type, setType]         = useState(REPORT_TYPES[0].value);
  const [location, setLocation] = useState("");
  const [status, setStatus]     = useState("idle"); // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState("");
  const [expiresIn, setExpiresIn] = useState(null);
  const resetTimer = useRef(null);

  // FIX 1: Auto-reset to idle after 6 seconds so the form is ready for the
  // next report without a page refresh. Clear any pending timer on unmount.
  useEffect(() => {
    return () => { if (resetTimer.current) clearTimeout(resetTimer.current); };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!location.trim()) return;
    setStatus("sending");
    setErrorMsg("");
    setExpiresIn(null);

    try {
      const point = await geocodeForMap(location.trim(), city);
      const result = await submitReport({
        city, type, location: location.trim(),
        lat: point.lat, lng: point.lng,
      });

      // FIX 2: Show expiry time from v2/report response
      setExpiresIn(result.expires_in ?? null);
      setStatus("sent");
      setLocation("");
      onReportSubmitted?.();

      // Auto-reset after 6 seconds
      resetTimer.current = setTimeout(() => {
        setStatus("idle");
        setExpiresIn(null);
      }, 6000);

    } catch (err) {
      console.error(err);

      // FIX 3: Handle ethics enforcement (403) with a friendly message
      // instead of showing the raw API error string.
      if (err.message.includes("403")) {
        setErrorMsg(
          "That report type is not allowed — CommuteIQ does not permit " +
          "police checkpoint or speed trap reporting."
        );
      } else {
        setErrorMsg(err.message || "Couldn't submit that. Try again.");
      }
      setStatus("error");

      // Auto-reset error after 8 seconds
      resetTimer.current = setTimeout(() => {
        setStatus("idle");
        setErrorMsg("");
      }, 8000);
    }
  }

  return (
    <form className="report-form" onSubmit={handleSubmit}>
      <h3>Report something on your route</h3>

      <div className="field">
        <label htmlFor="report-type">Type</label>
        <select
          id="report-type" value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {REPORT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="report-location">Location</label>
        <input
          id="report-location" value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Mombasa Road, near Nyayo Stadium"
          required
        />
      </div>

      <button
        type="submit" className="btn-secondary"
        disabled={status === "sending"}
      >
        {status === "sending" ? "Submitting…" : "Submit report"}
      </button>

      {status === "sent" && (
        <p className="form-status success">
          ✅ Thanks — this helps other commuters.
          {expiresIn && <span className="report-expiry"> Expires in {expiresIn}.</span>}
        </p>
      )}
      {status === "error" && (
        <p className="form-status error">
          {errorMsg || "Couldn't submit that. Try again."}
        </p>
      )}
    </form>
  );
}
