import { Calendar, Package, Store } from 'lucide-react';

export function HeroPanel({
  actions,
  filteredSamplesCount,
  linksSummary,
  loadingAnalytics,
  loadingProducts,
  onSelectedProductChange,
  onSelectedStoreChange,
  onTimeRangeChange,
  productOptions,
  selectedProduct,
  selectedProductLabel,
  selectedStore,
  storeStats,
  timeRange
}) {
  return (
    <section className="hero-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Visão geral</p>
          <h2>{selectedProductLabel}</h2>
        </div>

        <div className="panel-actions">
          {actions}
        </div>
      </div>

      <div className="toolbar-grid">
        <label className="field">
          <span className="field-label">Produto</span>
          <div className="field-input field-input--select">
            <Package size={18} />
            <select
              value={selectedProduct}
              onChange={(event) => onSelectedProductChange(event.target.value)}
              disabled={loadingProducts || !productOptions.length}
            >
              {!productOptions.length && <option value="">Nenhum produto encontrado</option>}
              {productOptions.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.group_name ? `${product.name} / ${product.group_name} ` : product.name}
                  {product.active === false ? ' (inativo)' : ''}
                </option>
              ))}
            </select>
          </div>
        </label>

        <label className="field">
          <span className="field-label">Período</span>
          <div className="field-input field-input--select">
            <Calendar size={18} />
            <select value={timeRange} onChange={(event) => onTimeRangeChange(event.target.value)}>
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="60">Últimos 60 dias</option>
              <option value="90">Últimos 90 dias</option>
              <option value="all">Todo o histórico</option>
            </select>
          </div>
        </label>

        <label className="field">
          <span className="field-label">Loja</span>
          <div className="field-input field-input--select">
            <Store size={18} />
            <select
              value={selectedStore}
              onChange={(event) => onSelectedStoreChange(event.target.value)}
              disabled={loadingAnalytics || !storeStats.length}
            >
              <option value="all">Todas as lojas</option>
              {storeStats.map((store) => (
                <option key={store.storeName} value={store.storeName}>
                  {store.storeName}
                </option>
              ))}
            </select>
          </div>
        </label>

        <div className="toolbar-card">
          <span className="eyebrow">Links ativos</span>
          <strong>{linksSummary.active}</strong>
          <span>{linksSummary.inactive} inativo(s)</span>
        </div>

        <div className="toolbar-card">
          <span className="eyebrow">Lojas no gráfico</span>
          <strong>{storeStats.length}</strong>
          <span>{filteredSamplesCount} captura(s) no período</span>
        </div>
      </div>
    </section>
  );
}
