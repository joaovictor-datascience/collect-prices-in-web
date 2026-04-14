import { useState } from 'react';
import { Check, Plus, X } from 'lucide-react';

import { ModalPortal } from './ModalPortal';

const EMPTY_FORM = { name: '', group_name: '', urlsText: '' };

function parseUrlsFromText(value) {
  return [...new Set(
    value.split(/\n|,/).map((item) => item.trim()).filter(Boolean)
  )];
}

function normalizeProductName(value) {
  return value.trim().toLowerCase();
}

export function ProductFormModal({
  products,
  onSubmit,
  submitting,
  open,
  onOpenChange
}) {
  const [form, setForm] = useState(EMPTY_FORM);

  const existingMatch = (() => {
    const normalized = normalizeProductName(form.name);
    if (!normalized) {
      return null;
    }
    return products.find((product) => normalizeProductName(product.name) === normalized) ?? null;
  })();

  function update(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const success = await onSubmit({
      name: form.name.trim(),
      group_name: form.group_name.trim(),
      urls: parseUrlsFromText(form.urlsText),
      existingMatch
    });

    if (success) {
      setForm(EMPTY_FORM);
      onOpenChange(false);
    }
  }

  return (
    <>
      <button type="button" className="primary-button" onClick={() => onOpenChange(true)}>
        <Plus size={16} />
        Novo produto
      </button>

      {open && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => onOpenChange(false)}>
            <div className="modal-box" onClick={(event) => event.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <p className="eyebrow">Cadastro</p>
                  <h2>Novo produto ou novos links</h2>
                </div>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => onOpenChange(false)}
                  aria-label="Fechar"
                >
                  <X size={18} />
                </button>
              </div>

              <form className="stack-form" onSubmit={handleSubmit}>
                <label className="field">
                  <span className="field-label">Nome do produto</span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) => update('name', event.target.value)}
                    placeholder="Ex.: RTX 4070 Super"
                    autoFocus
                  />
                </label>

                <label className="field">
                  <span className="field-label">Grupo (opcional)</span>
                  <input
                    type="text"
                    value={form.group_name}
                    onChange={(event) => update('group_name', event.target.value)}
                    placeholder="Ex.: GPU"
                  />
                </label>

                <label className="field">
                  <span className="field-label">Links do produto</span>
                  <textarea
                    value={form.urlsText}
                    onChange={(event) => update('urlsText', event.target.value)}
                    rows={5}
                    placeholder={'Cole um ou mais links, separados por quebra de linha\nhttps://loja.com/produto'}
                  />
                </label>

                {existingMatch ? (
                  <div className="helper-box">
                    <Check size={16} />
                    Esse nome ja existe. Ao salvar, vamos adicionar os links ao produto atual em vez de criar um duplicado.
                  </div>
                ) : (
                  <div className="helper-box helper-box--muted">
                    <Plus size={16} />
                    O cadastro aceita nome, grupo opcional e um ou mais links logo na criacao.
                  </div>
                )}

                <div className="modal-footer">
                  <button type="button" className="secondary-button" onClick={() => onOpenChange(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="primary-button" disabled={submitting}>
                    <Plus size={16} />
                    {submitting
                      ? 'Salvando...'
                      : existingMatch
                        ? 'Adicionar links ao existente'
                        : 'Cadastrar produto'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  );
}
