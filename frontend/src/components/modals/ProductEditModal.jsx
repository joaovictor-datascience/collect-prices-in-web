import { Package, PencilLine, X } from 'lucide-react';

import { EmptyPanel } from '../EmptyPanel';
import { ModalPortal } from './ModalPortal';

export function ProductEditModal({
  selectedProductData,
  productEdit,
  onFieldChange,
  onSubmit,
  saving,
  open,
  onOpenChange
}) {
  async function handleSubmit(event) {
    event.preventDefault();
    const success = await onSubmit();
    if (success) {
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
              <div className="modal-header">
                <div>
                  <p className="eyebrow">Edicao</p>
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

                  <div className="modal-footer">
                    <button type="button" className="secondary-button" onClick={() => onOpenChange(false)}>
                      Cancelar
                    </button>
                    <button type="submit" className="secondary-button" disabled={saving}>
                      <PencilLine size={16} />
                      {saving ? 'Salvando...' : 'Salvar produto'}
                    </button>
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
        </ModalPortal>
      )}
    </>
  );
}
