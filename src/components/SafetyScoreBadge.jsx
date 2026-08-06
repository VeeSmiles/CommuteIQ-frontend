// FIX: Handle null/undefined/0 score gracefully.
// Previously null → tier "low" → showed "High risk" which is wrong
// when the score simply hasn't loaded yet.
export default function SafetyScoreBadge({ score }) {
  if (score == null || score === undefined) return null;

  const numeric = Number(score);
  if (isNaN(numeric)) return null;

  const tier  = numeric >= 75 ? "high" : numeric >= 50 ? "mid" : "low";
  const label = tier === "high" ? "Safe" : tier === "mid" ? "Caution" : "High risk";

  return (
    <div className={`safety-badge safety-${tier}`}>
      <span className="safety-score">{Math.round(numeric)}</span>
      <span className="safety-label">{label}</span>
    </div>
  );
}
