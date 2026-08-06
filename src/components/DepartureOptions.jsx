import { formatDuration } from "../api/format.js";

// Calculates arrival time for a departure window.
// offset_min is how many minutes from now the window is.
// travel_time is how long the journey takes from that departure point.
function calcWindowArrival(offsetMin, travelMin) {
  if (!travelMin || travelMin === 0) return null;
  try {
    const now     = new Date();
    const total   = now.getHours() * 60 + now.getMinutes() + offsetMin + Math.round(travelMin);
    const hour    = Math.floor(total / 60) % 24;
    const minute  = total % 60;
    return `${String(hour).padStart(2,"0")}:${String(minute).padStart(2,"0")}`;
  } catch {
    return null;
  }
}

export default function DepartureOptions({ recommendation }) {
  if (!recommendation) return null;

  // FIX: Don't render anything if all windows have 0 travel time —
  // this means geocoding failed and the windows are meaningless.
  const hasRealData = recommendation.windows?.some((w) => w.travel_time > 0);
  if (!hasRealData) return null;

  return (
    <div className="departure-options">
      <h3>When should you leave?</h3>
      <p className="departure-headline">{recommendation.recommended_departure}</p>
      <div className="departure-windows">
        {recommendation.windows.map((w) => {
          const isBest   = w.offset_min === recommendation.best_window?.offset_min;
          const arrival  = calcWindowArrival(w.offset_min, w.travel_time);

          return (
            <div
              key={w.label}
              className={`departure-window ${isBest ? "best" : ""}`}
            >
              {/* FIX: "best" badge so it's clear which window is recommended */}
              {isBest && <div className="departure-best-badge">✅ Best</div>}

              <div className="departure-window-label">{w.label}</div>
              <div className="departure-window-time">{formatDuration(w.travel_time)}</div>

              {/* FIX: Show arrival time per window instead of raw congestion string */}
              {arrival && (
                <div className="departure-window-arrival">→ {arrival}</div>
              )}

              {/* FIX: Show quality label + emoji, not congestion (congestion is
                  already implied by the quality; showing raw "High" is confusing) */}
              <div className="departure-window-quality">
                {w.emoji} {w.quality}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
