/* ── libs react ──  */
import { useState } from 'react';

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
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [isProductEditOpen, setIsProductEditOpen] = useState(false);
  const [isProductLinksOpen, setIsProductLinksOpen] = useState(false);

  const {
    products, productOptions, selectedProduct, setSelectedProduct,
    selectedProductData, priceData, productUrls, productEdit,
    newLink, setNewLink, linkDrafts,
    loadingProducts, loadingHistory, loadingUrls,
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
    storeStats
  } = useProductAnalytics({
    priceData,
    timeRange,
    isDark,
    selectedProductData
  });

  /* ── render ───────────────────────────────────────────────────────────── */
  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="topbar-kicker">Monitoramento de preço</p>
          <h1>Collect prices</h1>
          <p className="topbar-subtitle">
            Cadastre produtos, gerencie links por loja e acompanhe o historico com comparativos mais claros.
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
              onClick={() => refreshSelectedProductData()}
              disabled={!selectedProduct || loadingHistory || loadingUrls || loadingProducts}
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
            <span className="field-label">Periodo</span>
            <div className="field-input field-input--select">
              <Calendar size={18} />
              <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
                <option value="7">Ultimos 7 dias</option>
                <option value="30">Ultimos 30 dias</option>
                <option value="60">Ultimos 60 dias</option>
                <option value="90">Ultimos 90 dias</option>
                <option value="all">Todo o historico</option>
              </select>
            </div>
          </label>

          <div className="toolbar-card">
            <span className="eyebrow">Links ativos</span>
            <strong>{linksSummary.active}</strong>
            <span>{linksSummary.inactive} inativo(s)</span>
          </div>

          <div className="toolbar-card">
            <span className="eyebrow">Lojas no grafico</span>
            <strong>{storeStats.length}</strong>
            <span>{filteredData.length} captura(s) no periodo</span>
          </div>
        </div>
      </section>

      <main className="content-grid">
        <section className="analytics-column">
          <div className="metrics-grid">
            <MetricCard icon={<DollarSign size={22} />} label="Preco atual" value={formatCurrency(overallStats.current)} tone="blue" />
            <MetricCard icon={<TrendingDown size={22} />} label="Menor preco" value={formatCurrency(overallStats.min)} tone="green" />
            <MetricCard icon={<TrendingUp size={22} />} label="Maior preco" value={formatCurrency(overallStats.max)} tone="red" />
            <MetricCard icon={<Activity size={22} />} label="Media do periodo" value={formatCurrency(overallStats.avg)} tone="amber" />
          </div>

          <ProductChart
            filteredData={filteredData}
            plotData={plotData}
            isDark={isDark}
            loadingHistory={loadingHistory}
            selectedProductData={selectedProductData}
          />

          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Cards abaixo do grafico</p>
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
              <EmptyPanel icon={<Store size={40} />} title="Sem cards por loja" description="Os cards aparecem quando o produto possui historico no periodo selecionado." />
            )}
          </section>
        </section>
      </main>
    </div>
  );
}
