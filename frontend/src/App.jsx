/* ── libs react ──  */
import { useState, useEffect } from 'react';

  /* ── icons ──  */
import {
  Activity,
  Calendar,
  DollarSign,
  Package,
  RefreshCcw,
  Store,
  TrendingDown,
  TrendingUp
} from 'lucide-react';
  
/* ── components react ──  */
import { ThemeToggle } from './components/ThemeToggle';
import { ProductChart } from './components/ProductChart';
import { StoreCard } from './components/StoreCard';
import { EmptyPanel } from './components/EmptyPanel';
import { MetricCard } from './components/MetricCard';
import { NoticeBanner } from './components/NoticeBanner';
import { ProductEditModal } from './components/modals/ProductEditModal';
import { ProductFormModal } from './components/modals/ProductFormModal';
import { ProductLinksModal } from './components/modals/ProductLinksModal';
import { useTheme } from './hooks/useTheme';
import { useProductAnalytics } from './hooks/useProductAnalytics';
import { useProducts } from './hooks/useProducts';
import { formatCurrency } from './utils/currency';

/* ── stage config ──  */
export default function App() {
  const { theme, toggle: toggleTheme, isDark } = useTheme();
  const [notice, setNotice] = useState(null);
  const [timeRange, setTimeRange] = useState('30');
  const [selectedStore, setSelectedStore] = useState('all');
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [isProductEditOpen, setIsProductEditOpen] = useState(false);
  const [isProductLinksOpen, setIsProductLinksOpen] = useState(false);

  const {
    products, productOptions, selectedProduct, setSelectedProduct,
    selectedProductData, productUrls, productEdit,
    newLink, setNewLink, linkDrafts,
    loadingProducts, loadingUrls,
    submittingProduct, savingProduct, submittingLink, savingLinkId,
    linksSummary,
    handleProductSubmit, handleProductUpdate,
    handleAddLink, handleSaveLink,
    updateLinkDraft, updateProductEditField,
    refreshSelectedProductData
  } = useProducts(setNotice);

  const {
    filteredData,
    overallStats,
    plotData,
    selectedProductLabel,
    storeStats,
    loadingAnalytics,
    refetchAnalytics
  } = useProductAnalytics({
    timeRange,
    storeFilter: selectedStore,
    isDark,
    selectedProductData
  });

  useEffect(() => {
    setSelectedStore('all');
  }, [selectedProduct]);

  /* ── render ───────────────────────────────────────────────────────────── */
  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="topbar-kicker">Monitoramento de preço</p>
          <h1>Collect prices</h1>
          <p className="topbar-subtitle">
            Cadastre produtos, gerencie links por loja e acompanhe o histórico com comparativos mais claros.
          </p>
        </div>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>

      <NoticeBanner notice={notice} onDismiss={() => setNotice(null)} />

      <section className="hero-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Visão geral</p>
            <h2>{selectedProductLabel}</h2>
          </div>

          {/* ── Action buttons ─────────────────────────────────────────── */}
          <div className="panel-actions">
            <ProductFormModal
              products={products}
              onSubmit={handleProductSubmit}
              submitting={submittingProduct}
              open={isProductFormOpen}
              onOpenChange={setIsProductFormOpen}
            />
            <ProductEditModal
              selectedProductData={selectedProductData}
              productEdit={productEdit}
              onFieldChange={updateProductEditField}
              onSubmit={handleProductUpdate}
              saving={savingProduct}
              open={isProductEditOpen}
              onOpenChange={setIsProductEditOpen}
            />
            <ProductLinksModal
              selectedProductData={selectedProductData}
              productUrls={productUrls}
              loadingUrls={loadingUrls}
              newLink={newLink}
              onNewLinkChange={setNewLink}
              linkDrafts={linkDrafts}
              onLinkDraftChange={updateLinkDraft}
              onAddLink={handleAddLink}
              onSaveLink={handleSaveLink}
              submittingLink={submittingLink}
              savingLinkId={savingLinkId}
              open={isProductLinksOpen}
              onOpenChange={setIsProductLinksOpen}
            />
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                refreshSelectedProductData();
                refetchAnalytics();
              }}
              disabled={!selectedProduct || loadingUrls || loadingProducts || loadingAnalytics}
            >
              <RefreshCcw size={16} />
              Atualizar
            </button>
          </div>
        </div>

        <div className="toolbar-grid">
          <label className="field">
            <span className="field-label">Produto</span>
            <div className="field-input field-input--select">
              <Package size={18} />
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                disabled={loadingProducts || !productOptions.length}
              >
                {!productOptions.length && <option value="">Nenhum produto encontrado</option>}
                {productOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.group_name ? `${p.group_name} / ${p.name}` : p.name}
                    {p.active === false ? ' (inativo)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label className="field">
            <span className="field-label">Período</span>
            <div className="field-input field-input--select">
              <Calendar size={18} />
              <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
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
                onChange={(e) => setSelectedStore(e.target.value)}
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
            <span>{filteredData.length} captura(s) no período</span>
          </div>
        </div>
      </section>

      <main className="content-grid">
        <section className="analytics-column">
          <div className="metrics-grid">
            <MetricCard 
              icon={<DollarSign size={22} />} 
              label="Preço atual" 
              value={formatCurrency(overallStats.current)} 
              subtext={overallStats.currentStore}
              tone="blue" 
            />
            <MetricCard
              icon={<TrendingDown size={22} />}
              label="Menor preço"
              value={formatCurrency(overallStats.min)}
              subtext={overallStats.minStore}
              tone="green"
              delta={overallStats.current != null && overallStats.min != null ? {
                current: overallStats.current,
                reference: overallStats.min,
                tooltip: overallStats.current === overallStats.min ? 'Preço atual está igual ao menor preço do período.'
                       : overallStats.current > overallStats.min ? 'Preço atual está acima do menor preço período.': 'Preço atual está abaixo do menor preço do período.'
              } : null}
            />
            <MetricCard
              icon={<TrendingUp size={22} />}
              label="Maior preço"
              value={formatCurrency(overallStats.max)}
              subtext={overallStats.maxStore}
              tone="red"
              delta={overallStats.current != null && overallStats.max != null ? {
                current: overallStats.current,
                reference: overallStats.max,
                tooltip: overallStats.current === overallStats.max ? 'Preço atual está igual ao maior preço do período.'
                       : overallStats.current > overallStats.max ? 'Preço atual está acima do maior preço período.': 'Preço atual está abaixo do maior preço do período.'
              } : null}
            />
            <MetricCard
              icon={<Activity size={22} />}
              label="Média do período"
              value={formatCurrency(overallStats.avg)}
              subtext="Entre lojas"
              tone="amber"
              delta={overallStats.current != null && overallStats.avg != null ? {
                current: overallStats.current,
                reference: overallStats.avg,
                tooltip: overallStats.current === overallStats.avg ? 'Preço atual está igual à média do período.'
                       : overallStats.current > overallStats.avg ? 'Preço atual está acima da média do período.' : 'Preço atual está abaixo da média do período.'
              } : null}
            />
          </div>

          <ProductChart
            filteredData={filteredData}
            plotData={plotData}
            isDark={isDark}
            loadingHistory={loadingAnalytics}
            selectedProductData={selectedProductData}
            timeRange={timeRange}
          />

          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Cards abaixo do gráfico</p>
                <h2>Resumo por loja</h2>
              </div>
            </div>

            {storeStats.length ? (
              <div className="store-grid">
                {storeStats.map((store) => (
                  <StoreCard key={store.storeName} store={store} productName={selectedProductData?.name} />
                ))}
              </div>
            ) : (
              <EmptyPanel icon={<Store size={40} />} title="Sem cards por loja" description="Os cards aparecem quando o produto possui histórico no período selecionado." />
            )}
          </section>
        </section>
      </main>
    </div>
  );
}
