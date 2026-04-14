export function EmptyPanel({ icon, title, description }) {
  return (
    <div className="empty-panel">
      {icon}
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
