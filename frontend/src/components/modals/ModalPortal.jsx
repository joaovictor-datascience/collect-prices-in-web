import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const MODAL_ROOT_ID = 'modal-root';
const MODAL_COUNT_KEY = 'modalCount';

function ensureModalRoot() {
  let root = document.getElementById(MODAL_ROOT_ID);

  if (!root) {
    root = document.createElement('div');
    root.id = MODAL_ROOT_ID;
    document.body.appendChild(root);
  }

  return root;
}

export function ModalPortal({ children }) {
  const [portalRoot] = useState(() => {
    if (typeof document === 'undefined') {
      return null;
    }

    return ensureModalRoot();
  });

  useEffect(() => {
    if (!portalRoot) {
      return undefined;
    }

    const currentCount = Number(document.body.dataset[MODAL_COUNT_KEY] ?? '0') + 1;
    document.body.dataset[MODAL_COUNT_KEY] = String(currentCount);
    document.body.classList.add('modal-open');

    return () => {
      const nextCount = Math.max(0, Number(document.body.dataset[MODAL_COUNT_KEY] ?? '1') - 1);

      if (nextCount === 0) {
        delete document.body.dataset[MODAL_COUNT_KEY];
        document.body.classList.remove('modal-open');
      } else {
        document.body.dataset[MODAL_COUNT_KEY] = String(nextCount);
      }
    };
  }, [portalRoot]);

  if (!portalRoot) {
    return null;
  }

  return createPortal(children, portalRoot);
}
