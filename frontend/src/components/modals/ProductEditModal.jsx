import { useEffect, useState } from 'react';
import { Package, PencilLine, X, Trash2 } from 'lucide-react';

import { EmptyPanel } from '../EmptyPanel';
import { ConfirmDialog } from './ConfirmDialog';
import { ModalPortal } from './ModalPortal';

export function ProductEditModal({
  selectedProductData,
  productEdit,
  onFieldChange,
  onSubmit,
  onDelete,
  saving,
  deletingProduct,
  open,
  onOpenChange
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setConfirmOpen(false);
    }
  }, [open]);

  async function handleSubmit(event) {
    event.preventDefault();
    const success = await onSubmit();
    if (success) {
      onOpenChange(false);
    }
  }

  async function handleDelete() {
    if (!selectedProductData) return;

    const success = await onDelete();
    if (success) {
      setConfirmOpen(false);
      onOpenChange(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="secondary-button"
        onClick={() => onOpenChange(true)}
        disabled={!selectedProductData}
        title={!selectedProductData ? 'Selecione um produto primeiro' : undefined}
      >
        <PencilLine size={16} />
        Editar produto
      </button>

      {open && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => onOpenChange(false)}>
            <div className="modal-box" onClick={(event) => event.stopPropagation()}>
              <div className="modal-scroll">
                <div className="modal-header">
                  <div>
                    <p className="eyebrow">Edição</p>
                    <h2>Produto selecionado</h2>
                  </div>
                  <div className="modal-header-actions">
                    {selectedProductData && (
                      <span className={`pill ${selectedProductData.active === false ? 'pill--danger' : ''}`}>
                        {selectedProductData.active === false ? 'Inativo' : 'Ativo'}
                      </span>
                    )}
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => onOpenChange(false)}
                      aria-label="Fechar"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {selectedProductData ? (
                  <form className="stack-form" onSubmit={handleSubmit}>
                    <label className="field">
                      <span className="field-label">Nome</span>
                      <input
                        type="text"
                        value={productEdit.name}
                        onChange={(event) => onFieldChange('name', event.target.value)}
                        autoFocus
                      />
                    </label>

                    <label className="field">
                      <span className="field-label">Grupo</span>
                      <input
                        type="text"
                        value={productEdit.group_name}
                        onChange={(event) => onFieldChange('group_name', event.target.value)}
                        placeholder="Sem grupo"
                      />
                    </label>

                    <div className="modal-footer modal-footer--split">
                      <button
                        type="button"
                        className="secondary-button button-delete product-edit-delete"
                        disabled={deletingProduct || saving}
                        onClick={() => setConfirmOpen(true)}
                      >
                        <Trash2 size={16} />
                        {deletingProduct ? 'Excluindo...' : 'Excluir'}
                      </button>

                      <div className="modal-footer-actions">
                        <button type="button" className="secondary-button" onClick={() => onOpenChange(false)}>
                          Cancelar
                        </button>

                        <button
                          type="submit"
                          className="secondary-button product-edit-save"
                          disabled={saving || deletingProduct}
                        >
                          <PencilLine size={16} />
                          {saving ? 'Salvando...' : 'Salvar produto'}
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <EmptyPanel
                    icon={<Package size={40} />}
                    title="Nenhum produto selecionado"
                    description="Escolha um item no topo para editar nome, grupo e links."
                  />
                )}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Excluir produto?"
        description={selectedProductData ? `"${selectedProductData.name}" será removido permanentemente.` : ''}
        confirmLabel={deletingProduct ? 'Excluindo...' : 'Excluir'}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
        busy={deletingProduct}
      />
    </>
  );
}
