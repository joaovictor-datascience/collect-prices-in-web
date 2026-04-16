import { useEffect, useState } from 'react';
import { Play, RefreshCcw, ScrollText } from 'lucide-react';

import { NoticeBanner } from './components/NoticeBanner';
import { ProductChart } from './components/ProductChart';
import { ThemeToggle } from './components/ThemeToggle';
import { ProductEditModal } from './components/modals/ProductEditModal';
import { ProductFormModal } from './components/modals/ProductFormModal';
import { ProductLinksModal } from './components/modals/ProductLinksModal';
import { ScraperPanel } from './components/modals/ScraperPanel';
import { ScraperRunModal } from './components/modals/ScraperRunModal';
import { useProductAnalytics } from './hooks/useProductAnalytics';
import { useProductEdit } from './hooks/useProductEdit';
import { useProductLinks } from './hooks/useProductLinks';
import { useProductList } from './hooks/useProductList';
import { useScraperJob } from './hooks/useScraperJob';
import { useTheme } from './hooks/useTheme';
import { HeroPanel } from './sections/HeroPanel';
import { MetricsSection } from './sections/MetricsSection';
import { StoreComparisonSection } from './sections/StoreComparisonSection';

export default function App() {
  const { theme, toggle: toggleTheme, isDark } = useTheme();
  const [notice, setNotice] = useState(null);
  const [timeRange, setTimeRange] = useState('30');
  const [selectedStore, setSelectedStore] = useState('all');
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [isProductEditOpen, setIsProductEditOpen] = useState(false);
  const [isProductLinksOpen, setIsProductLinksOpen] = useState(false);
  const [isScraperPanelOpen, setIsScraperPanelOpen] = useState(false);
  const [isScraperRunOpen, setIsScraperRunOpen] = useState(false);

  const {
    products,
    productOptions,
    selectedProduct,
    setSelectedProduct,
    selectedProductData,
    loadingProducts,
    submittingProduct,
    deletingProduct,
    loadProducts,
    handleProductSubmit: submitProduct,
    handleProductDelete: deleteProduct
  } = useProductList(setNotice);

  const {
    productUrls,
    newLink,
    setNewLink,
    linkDrafts,
    loadingUrls,
    submittingLink,
    savingLinkId,
    deletingLinkId,
    linksSummary,
    loadProductUrls,
    handleAddLink,
    handleSaveLink,
    handleDeleteLink,
    updateLinkDraft,
    skipNextAutoFetchRef
  } = useProductLinks({ selectedProduct, setNotice });

  const {
    productEdit,
    savingProduct,
    updateProductEditField,
    handleProductUpdate: updateProduct
  } = useProductEdit({ selectedProductData, setNotice });

  const {
    filteredData,
    overallStats,
    selectedProductLabel,
    storeStats,
    loadingAnalytics,
    refetchAnalytics
  } = useProductAnalytics({
    timeRange,
    storeFilter: selectedStore,
    selectedProductData
  });

  const {
    job: scraperJob,
    jobs: scraperJobs,
    selectedJobId,
    logs: scraperLogs,
    loadingLatest: loadingScraperLatest,
    loadingJob: loadingScraperJob,
    loadingJobs: loadingScraperJobs,
    startingJob,
    activeJob,
    activeJobId,
    refreshSelectedJob,
    selectJob,
    startJob
  } = useScraperJob({
    open: isScraperPanelOpen || isScraperRunOpen,
    setNotice
  });

  useEffect(() => {
    setSelectedStore('all');
  }, [selectedProduct]);

  async function refreshSelectedProductData(productId = selectedProduct) {
    if (!productId) {
      return;
    }
    await Promise.all([loadProductUrls(productId), loadProducts(productId)]);
  }

  function handleRefresh() {
    refreshSelectedProductData();
    refetchAnalytics();
  }

  function handleProductSubmit(payload) {
    return submitProduct(payload, {
      prepareNextAutoFetchSkip: () => {
        skipNextAutoFetchRef.current = true;
      },
      refreshSelectedProductData
    });
  }

  function handleProductUpdate() {
    return updateProduct(loadProducts);
  }

  function handleProductDelete() {
    return deleteProduct(selectedProductData);
  }

  async function handleScraperStart(payload) {
    const started = await startJob(payload);
    if (started) {
      setIsScraperRunOpen(false);
      setIsScraperPanelOpen(true);
    }
    return started;
  }

  const heroActions = (
    <>
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
        onDelete={handleProductDelete}
        deletingProduct={deletingProduct}
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
        onDeleteLink={handleDeleteLink}
        submittingLink={submittingLink}
        savingLinkId={savingLinkId}
        deletingLinkId={deletingLinkId}
        linksSummary={linksSummary}
        open={isProductLinksOpen}
        onOpenChange={setIsProductLinksOpen}
      />
      <button
        type="button"
        className="secondary-button"
        onClick={handleRefresh}
        disabled={!selectedProduct || loadingUrls || loadingProducts || loadingAnalytics}
      >
        <RefreshCcw size={16} />
        Atualizar
      </button>
    </>
  );

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
        <div className="topbar-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => setIsScraperPanelOpen(true)}
          >
            <ScrollText size={16} />
            Logs scraper
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setIsScraperRunOpen(true)}
          >
            <Play size={16} />
            Executar scraper
          </button>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>

      <NoticeBanner notice={notice} onDismiss={() => setNotice(null)} />

      <ScraperRunModal
        products={products}
        activeJob={activeJob}
        activeJobId={activeJobId}
        startingJob={startingJob}
        onStartJob={handleScraperStart}
        open={isScraperRunOpen}
        onOpenChange={setIsScraperRunOpen}
      />

      <ScraperPanel
        job={scraperJob}
        jobs={scraperJobs}
        selectedJobId={selectedJobId}
        logs={scraperLogs}
        loadingLatest={loadingScraperLatest}
        loadingJob={loadingScraperJob}
        loadingJobs={loadingScraperJobs}
        onRefresh={refreshSelectedJob}
        onSelectJob={selectJob}
        open={isScraperPanelOpen}
        onOpenChange={setIsScraperPanelOpen}
      />

      <HeroPanel
        actions={heroActions}
        filteredSamplesCount={filteredData.length}
        linksSummary={linksSummary}
        loadingAnalytics={loadingAnalytics}
        loadingProducts={loadingProducts}
        onSelectedProductChange={setSelectedProduct}
        onSelectedStoreChange={setSelectedStore}
        onTimeRangeChange={setTimeRange}
        productOptions={productOptions}
        selectedProduct={selectedProduct}
        selectedProductLabel={selectedProductLabel}
        selectedStore={selectedStore}
        storeStats={storeStats}
        timeRange={timeRange}
      />

      <main className="content-grid">
        <section className="analytics-column">
          <MetricsSection overallStats={overallStats} />

          <ProductChart
            filteredData={filteredData}
            isDark={isDark}
            loadingHistory={loadingAnalytics}
            selectedProductData={selectedProductData}
            timeRange={timeRange}
          />

          <StoreComparisonSection
            storeStats={storeStats}
            selectedProductName={selectedProductData?.name}
          />
        </section>
      </main>
    </div>
  );
}
