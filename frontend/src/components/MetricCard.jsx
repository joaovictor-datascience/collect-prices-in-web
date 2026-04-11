export function MetricCard({ icon, label, value, tone }) {
  return (
    <article className="metric-card">
      <p className="eyebrow metric-title">{label}</p>
      <div className="metric-content">
        <div className={`metric-icon metric-icon--${tone}`}>{icon}</div>
        <p className="metric-value">{value}</p>
      </div>
    </article>
  );
}
