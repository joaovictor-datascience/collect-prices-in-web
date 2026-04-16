import { useEffect, useMemo, useState } from 'react';
import { Check, Play, X } from 'lucide-react';

import { ModalPortal } from './ModalPortal';

function getProductLabel(product) {
  return product.group_name ? `Grupo: ${product.group_name}` : `Produto ativo #${product.id}`;
}

export function ScraperRunModal({
  products,
  activeJob,
  activeJobId,
  startingJob,
  onStartJob,
  open,
  onOpenChange
}) {
  const activeProducts = useMemo(
    () => products.filter((product) => product.active !== false),
    [products]
  );

  const [scopeMode, setScopeMode] = useState('all');
  const [selectedProductIds, setSelectedProductIds] = useState([]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setScopeMode('all');
    setSelectedProductIds(activeProducts.map((product) => product.id));
  }, [activeProducts, open]);

  function toggleProduct(productId) {
    setSelectedProductIds((current) => (
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId]
    ));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const success = await onStartJob({
      productIds: scopeMode === 'custom' ? selectedProductIds : null
    });

    if (success) {
      onOpenChange(false);
    }
  }

  const customSelectionInvalid = scopeMode === 'custom' && selectedProductIds.length === 0;

  if (!open) {
    return null;
  }

  return (
    <ModalPortal>
      <div className="modal-overlay" onClick={() => onOpenChange(false)}>
        <div className="modal-box scraper-run-modal" onClick={(event) => event.stopPropagation()}>
          <div className="modal-scroll">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Execução manual</p>
                <h2>Executar scraper</h2>
                <p className="scraper-panel__subtitle">
                  Escolha se a execução deve rodar todos os produtos ativos ou apenas um recorte manual.
                </p>
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
              <div className="scraper-scope-grid">
                <button
                  type="button"
                  className={`scraper-scope-card ${scopeMode === 'all' ? 'scraper-scope-card--selected' : ''}`}
                  onClick={() => setScopeMode('all')}
                >
                  <strong>Todos os produtos ativos</strong>
                  <span>{activeProducts.length} produto(s) entram na execução.</span>
                </button>
                <button
                  type="button"
                  className={`scraper-scope-card ${scopeMode === 'custom' ? 'scraper-scope-card--selected' : ''}`}
                  onClick={() => setScopeMode('custom')}
                >
                  <strong>Escolher produtos</strong>
                  <span>Use um recorte manual para essa execução.</span>
                </button>
              </div>

              {scopeMode === 'custom' ? (
                <div className="scraper-product-picker">
                  <div className="scraper-product-picker__header">
                    <span className="field-label">Produtos selecionados</span>
                    <div className="scraper-product-picker__actions">
                      <button
                        type="button"
                        className="inline-link"
                        onClick={() => setSelectedProductIds(activeProducts.map((product) => product.id))}
                      >
                        Selecionar todos
                      </button>
                      <button
                        type="button"
                        className="inline-link"
                        onClick={() => setSelectedProductIds([])}
                      >
                        Limpar
                      </button>
                    </div>
                  </div>

                  <div className="scraper-product-list">
                    {activeProducts.map((product) => {
                      const checked = selectedProductIds.includes(product.id);

                      return (
                        <label key={product.id} className={`scraper-product-item ${checked ? 'scraper-product-item--selected' : ''}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleProduct(product.id)}
                          />
                          <div>
                            <strong>{product.name}</strong>
                            <span>{getProductLabel(product)}</span>
                          </div>
                          {checked ? <Check size={16} /> : null}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {activeJob ? (
                <div className="helper-box">
                  <Play size={16} />
                  Já existe um job em andamento{activeJobId ? ` (#${activeJobId})` : ''}. Aguarde ele terminar antes de iniciar outro.
                </div>
              ) : scopeMode === 'custom' ? (
                <div className={`helper-box ${customSelectionInvalid ? '' : 'helper-box--muted'}`}>
                  <Check size={16} />
                  {customSelectionInvalid
                    ? 'Selecione ao menos um produto para iniciar uma execução parcial.'
                    : `${selectedProductIds.length} produto(s) entrarão nessa execução manual.`}
                </div>
              ) : (
                <div className="helper-box helper-box--muted">
                  <Check size={16} />
                  O worker vai processar todos os produtos ativos cadastrados.
                </div>
              )}

              <div className="modal-footer">
                <button type="button" className="secondary-button" onClick={() => onOpenChange(false)}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={startingJob || activeJob || customSelectionInvalid || !activeProducts.length}
                >
                  <Play size={16} />
                  {startingJob ? 'Enfileirando...' : 'Executar scraper'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
