import { AlertTriangle, X } from 'lucide-react';

import { ModalPortal } from './ModalPortal';

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  busy = false
}) {
  if (!open) {
    return null;
  }

  return (
    <ModalPortal>
      <div className="confirm-dialog-overlay" onClick={busy ? undefined : onCancel}>
        <div className="confirm-dialog" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            className="ghost-button confirm-dialog__close"
            onClick={onCancel}
            aria-label="Fechar"
            disabled={busy}
          >
            <X size={16} />
          </button>

          <div className="confirm-dialog__icon" aria-hidden="true">
            <AlertTriangle size={22} />
          </div>

          <div className="confirm-dialog__content">
            <h3>{title}</h3>
            <p>{description}</p>
          </div>

          <div className="confirm-dialog__actions">
            <button type="button" className="secondary-button" onClick={onCancel} disabled={busy}>
              {cancelLabel}
            </button>
            <button type="button" className="secondary-button button-delete product-edit-delete" onClick={onConfirm} disabled={busy}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
