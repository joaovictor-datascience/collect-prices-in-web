import { ExternalLink, Link2, RefreshCcw, Save, X } from 'lucide-react';

import { EmptyPanel } from '../EmptyPanel';
import { inferStoreNameFromUrl } from '../../utils/store';
import { ModalPortal } from './ModalPortal';

export function ProductLinksModal({
  selectedProductData,
  productUrls,
  loadingUrls,
  newLink,
  onNewLinkChange,
  linkDrafts,
  onLinkDraftChange,
  onAddLink,
  onSaveLink,
  submittingLink,
  savingLinkId,
  open,
  onOpenChange
}) {
  const linksSummary = {
    active: productUrls.filter((link) => link.active).length,
    inactive: productUrls.filter((link) => !link.active).length
  };

  function handleAddLink(event) {
    event.preventDefault();
    onAddLink();
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
        <Link2 size={16} />
        Gerenciar links
        {productUrls.length > 0 && (
          <span className="pill pill--compact">
            {productUrls.length}
          </span>
        )}
      </button>

      {open && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => onOpenChange(false)}>
            <div className="modal-box modal-box--wide" onClick={(event) => event.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <p className="eyebrow">Links</p>
                  <h2>Gerenciar links por produto</h2>
                </div>
                <div className="modal-header-actions">
                  <span className="pill">{productUrls.length} total</span>
                  {linksSummary.inactive > 0 && (
                    <span className="pill pill--danger">{linksSummary.inactive} inativo(s)</span>
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
                <>
                  <form className="inline-form" onSubmit={handleAddLink}>
                    <div className="field field--grow">
                      <span className="field-label">Novo link</span>
                      <div className="field-input">
                        <Link2 size={18} />
                        <input
                          type="url"
                          value={newLink}
                          onChange={(event) => onNewLinkChange(event.target.value)}
                          placeholder="https://loja.com/produto"
                        />
                      </div>
                    </div>
                    <button type="submit" className="primary-button" disabled={submittingLink}>
                      <Link2 size={16} />
                      {submittingLink ? 'Adicionando...' : 'Adicionar'}
                    </button>
                  </form>

                  {loadingUrls ? (
                    <EmptyPanel
                      icon={<RefreshCcw size={40} />}
                      title="Carregando links"
                      description="Buscando os links cadastrados para o produto selecionado."
                    />
                  ) : productUrls.length ? (
                    <div className="links-list">
                      {productUrls.map((link) => {
                        const draft = linkDrafts[link.id] ?? { url: link.url, active: link.active };
                        const isDirty = draft.url !== link.url || draft.active !== link.active;

                        return (
                          <article key={link.id} className="link-card">
                            <div className="link-card-header">
                              <div>
                                <p className="eyebrow">{inferStoreNameFromUrl(link.url)}</p>
                                <h3>{link.active ? 'Link ativo' : 'Link desativado'}</h3>
                              </div>
                              <label className="toggle">
                                <input
                                  type="checkbox"
                                  checked={Boolean(draft.active)}
                                  onChange={(event) => onLinkDraftChange(link.id, 'active', event.target.checked)}
                                />
                                <span>{draft.active ? 'Ativo' : 'Inativo'}</span>
                              </label>
                            </div>

                            <label className="field">
                              <span className="field-label">URL</span>
                              <input
                                type="url"
                                value={draft.url}
                                onChange={(event) => onLinkDraftChange(link.id, 'url', event.target.value)}
                              />
                            </label>

                            <div className="link-card-actions">
                              <a href={link.url} target="_blank" rel="noreferrer" className="inline-link">
                                Abrir loja
                                <ExternalLink size={16} />
                              </a>
                              <button
                                type="button"
                                className="secondary-button"
                                disabled={!isDirty || savingLinkId === link.id}
                                onClick={() => onSaveLink(link.id)}
                              >
                                <Save size={16} />
                                {savingLinkId === link.id ? 'Salvando...' : 'Salvar link'}
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyPanel
                      icon={<Link2 size={40} />}
                      title="Nenhum link cadastrado"
                      description="Adicione um novo link para comecar a monitorar esse produto."
                    />
                  )}
                </>
              ) : (
                <EmptyPanel
                  icon={<Link2 size={40} />}
                  title="Selecione um produto"
                  description="Os links aparecem aqui para edicao, ativacao e desativacao."
                />
              )}
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  );
}
