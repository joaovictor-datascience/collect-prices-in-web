export function NoticeBanner({ notice, onDismiss }) {
  if (!notice) {
    return null;
  }

  return (
    <div className={`notice notice--${notice.type}`}>
      <span>{notice.message}</span>
      <button type="button" className="ghost-button" onClick={onDismiss}>
        Fechar
      </button>
    </div>
  );
}
