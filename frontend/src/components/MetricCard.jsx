import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';

function DeltaTooltip({ anchorRef, tooltipText, visible }) {
  const [coords, setCoords] = useState(null);

  useEffect(() => {
    if (!visible || !anchorRef.current) {
      setCoords(null);
      return;
    }
    const rect = anchorRef.current.getBoundingClientRect();
    setCoords({
      top: rect.top + window.scrollY - 8,
      left: rect.left + rect.width / 2 + window.scrollX,
    });
  }, [visible, anchorRef]);

  if (!visible || !coords) return null;

  return createPortal(
    <div
      className="metric-delta-tooltip"
      style={{ top: coords.top, left: coords.left }}
    >
      <span className="metric-delta-tooltip__label">vs. preço atual</span>
      {tooltipText}
      <div className="metric-delta-tooltip__arrow" />
    </div>,
    document.body,
  );
}

function DeltaBadge({ current, reference, tooltipText }) {
  const [hovered, setHovered] = useState(false);
  const badgeRef = useRef(null);

  if (current == null || reference == null || reference === 0) return null;

  const pct = ((current - reference) / Math.abs(reference)) * 100;
  const rounded = Math.abs(pct).toFixed(1);

  let tone, ArrowIcon, label;

  if (Math.abs(pct) < 0.05) {
    tone = 'neutral';
    ArrowIcon = Minus;
    label = '0,0%';
  } else if (pct > 0) {
    tone = 'up';
    ArrowIcon = ArrowUp;
    label = `+${rounded}%`;
  } else {
    tone = 'down';
    ArrowIcon = ArrowDown;
    label = `-${rounded}%`;
  }

  return (
    <>
      <span
        ref={badgeRef}
        className={`metric-delta metric-delta--${tone}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <ArrowIcon size={11} strokeWidth={2.5} />
        {label}
      </span>

      <DeltaTooltip
        anchorRef={badgeRef}
        tooltipText={tooltipText}
        visible={hovered}
      />
    </>
  );
}

export function MetricCard({ icon, label, value, tone, delta, subtext }) {
  return (
    <article className="metric-card">
      <div className="metric-title-row">
        <p className="eyebrow metric-title">{label}</p>
        {delta && (
          <DeltaBadge
            current={delta.current}
            reference={delta.reference}
            tooltipText={delta.tooltip}
          />
        )}
      </div>
      <div className="metric-content">
        <div className={`metric-icon metric-icon--${tone}`}>{icon}</div>
        <p className="metric-value">{value}</p>
      </div>
      {subtext && <p className="metric-subtext"><strong>Loja:</strong> {subtext}</p>}
    </article>
  );
}
