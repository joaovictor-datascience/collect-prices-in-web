export function MetricCard({ icon, label, value, tone }) {
  return (
    <article className="metric-card">
      <div className={`metric-icon metric-icon--${tone}`}>{icon}</div>
      <div>
        <p className="eyebrow">{label}</p>
        <p className="metric-value">{value}</p>
      </div>
    </article>
  );
}
