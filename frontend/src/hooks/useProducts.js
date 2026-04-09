import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const EMPTY_PRODUCT_EDIT = { name: '', group_name: '' };

export function useProducts(setNotice) {
  const apiUrl = import.meta.env.VITE_API_URL;
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [priceData, setPriceData] = useState([]);
  const [productUrls, setProductUrls] = useState([]);
  const [productEdit, setProductEdit] = useState(EMPTY_PRODUCT_EDIT);
  const [newLink, setNewLink] = useState('');
  const [linkDrafts, setLinkDrafts] = useState({});

  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingUrls, setLoadingUrls] = useState(false);
  const [submittingProduct, setSubmittingProduct] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [submittingLink, setSubmittingLink] = useState(false);
  const [savingLinkId, setSavingLinkId] = useState(null);

  /* ── loaders ──────────────────────────────────────────────────────────── */
  async function loadProducts(preferredProductId) {
    setLoadingProducts(true);
    try {
      const response = await axios.get(`${apiUrl}/api/products`);
      if (Array.isArray(response.data)) {
        setProducts(response.data);
        setSelectedProduct((current) => {
          const preferred = preferredProductId ? String(preferredProductId) : null;
          if (preferred && response.data.some((p) => String(p.id) === preferred)) return preferred;
          if (current && response.data.some((p) => String(p.id) === String(current))) return String(current);
          const first = response.data.find((p) => p.active !== false) ?? response.data[0];
          return first ? String(first.id) : '';
        });
      }
    } catch {
      setNotice({ type: 'error', message: 'Nao foi possivel carregar os produtos.' });
    } finally {
      setLoadingProducts(false);
    }
  }

  async function loadPriceHistory(productId) {
    setLoadingHistory(true);
    try {
      const response = await axios.get(`${apiUrl}/api/history/${productId}`);
      setPriceData(Array.isArray(response.data) ? response.data : []);
    } catch {
      setPriceData([]);
      setNotice({ type: 'error', message: 'Nao foi possivel carregar o historico do produto.' });
    } finally {
      setLoadingHistory(false);
    }
  }

  async function loadProductUrls(productId) {
    setLoadingUrls(true);
    try {
      const response = await axios.get(`${apiUrl}/api/products/${productId}/urls`);
      setProductUrls(Array.isArray(response.data) ? response.data : []);
    } catch {
      setProductUrls([]);
      setNotice({ type: 'error', message: 'Nao foi possivel carregar os links do produto.' });
    } finally {
      setLoadingUrls(false);
    }
  }

  async function refreshSelectedProductData(productId = selectedProduct) {
    if (!productId) return;
    await Promise.all([loadPriceHistory(productId), loadProductUrls(productId), loadProducts(productId)]);
  }

  async function submitUrlsToProduct(productId, urls) {
    const created = [], duplicated = [], failed = [];
    for (const url of urls) {
      try {
        const res = await axios.post(`${apiUrl}/api/products/${productId}/urls`, { url });
        created.push(res.data);
      } catch (error) {
        error.response?.status === 409 ? duplicated.push(url) : failed.push(url);
      }
    }
    return { created, duplicated, failed };
  }

  /* ── handlers ─────────────────────────────────────────────────────────── */
  async function handleProductSubmit({ name, group_name, urls, existingMatch }) {
    if (!name) {
      setNotice({ type: 'error', message: 'Informe o nome do produto para continuar.' });
      return false;
    }
    if (!urls.length) {
      setNotice({ type: 'error', message: 'Adicione pelo menos um link do produto.' });
      return false;
    }

    setSubmittingProduct(true);
    try {
      if (existingMatch) {
        const result = await submitUrlsToProduct(existingMatch.id, urls);
        setSelectedProduct(String(existingMatch.id));
        await refreshSelectedProductData(existingMatch.id);
        if (result.created.length) {
          const suffix = result.duplicated.length ? ` ${result.duplicated.length} link(s) ja existiam.` : '';
          setNotice({ type: 'success', message: `${result.created.length} novo(s) link(s) adicionados ao produto existente.${suffix}` });
          return true;
        }
        if (result.duplicated.length) {
          setNotice({ type: 'info', message: 'Os links informados ja estavam cadastrados para esse produto.' });
          return true;
        }
        setNotice({ type: 'error', message: 'Nao foi possivel adicionar os novos links ao produto existente.' });
        return false;
      }

      const response = await axios.post(`${apiUrl}/api/products`, { name, group_name: group_name || null, urls });
      setSelectedProduct(String(response.data.id));
      await refreshSelectedProductData(response.data.id);
      setNotice({ type: 'success', message: 'Produto cadastrado com sucesso.' });
      return true;
    } catch (error) {
      const msg = error.response?.data?.error;
      setNotice({ type: 'error', message: msg || 'Nao foi possivel salvar o produto agora.' });
      return false;
    } finally {
      setSubmittingProduct(false);
    }
  }

  async function handleProductUpdate() {
    if (!selectedProductData) return false;
    const payload = { name: productEdit.name.trim(), group_name: productEdit.group_name.trim() || null };
    setSavingProduct(true);
    try {
      await axios.put(`${apiUrl}/api/products/${selectedProductData.id}`, payload);
      await loadProducts(selectedProductData.id);
      setNotice({ type: 'success', message: 'Dados do produto atualizados.' });
      return true;
    } catch (error) {
      const msg = error.response?.data?.error;
      setNotice({ type: 'error', message: msg || 'Nao foi possivel atualizar o produto.' });
      return false;
    } finally {
      setSavingProduct(false);
    }
  }

  async function handleAddLink() {
    if (!selectedProductData) return;
    const trimmed = newLink.trim();
    if (!trimmed) {
      setNotice({ type: 'error', message: 'Informe um link valido para adicionar.' });
      return;
    }
    setSubmittingLink(true);
    try {
      await axios.post(`${apiUrl}/api/products/${selectedProductData.id}/urls`, { url: trimmed });
      setNewLink('');
      await refreshSelectedProductData(selectedProductData.id);
      setNotice({ type: 'success', message: 'Novo link adicionado ao produto.' });
    } catch (error) {
      const msg = error.response?.data?.error;
      setNotice({ type: 'error', message: msg || 'Nao foi possivel adicionar o novo link.' });
    } finally {
      setSubmittingLink(false);
    }
  }

  async function handleSaveLink(linkId) {
    const draft = linkDrafts[linkId];
    if (!draft?.url?.trim()) {
      setNotice({ type: 'error', message: 'O link nao pode ficar vazio.' });
      return;
    }
    setSavingLinkId(linkId);
    try {
      await axios.put(`${apiUrl}/api/urls/${linkId}`, { url: draft.url.trim(), active: draft.active });
      await refreshSelectedProductData(selectedProduct);
      setNotice({ type: 'success', message: 'Link atualizado com sucesso.' });
    } catch (error) {
      const msg = error.response?.data?.error;
      setNotice({ type: 'error', message: msg || 'Nao foi possivel atualizar esse link.' });
    } finally {
      setSavingLinkId(null);
    }
  }

  function updateLinkDraft(linkId, field, value) {
    setLinkDrafts((prev) => ({ ...prev, [linkId]: { ...prev[linkId], [field]: value } }));
  }

  function updateProductEditField(field, value) {
    setProductEdit((prev) => ({ ...prev, [field]: value }));
  }

  /* ── derived ──────────────────────────────────────────────────────────── */
  const selectedProductData = useMemo(
    () => products.find((p) => String(p.id) === String(selectedProduct)),
    [products, selectedProduct]
  );

  const productOptions = useMemo(
    () => [...products].sort((a, b) => {
      const la = `${a.group_name ?? ''} ${a.name}`.trim();
      const lb = `${b.group_name ?? ''} ${b.name}`.trim();
      return la.localeCompare(lb, 'pt-BR');
    }),
    [products]
  );

  const linksSummary = useMemo(() => {
    const active = productUrls.filter((l) => l.active).length;
    return { active, inactive: productUrls.length - active };
  }, [productUrls]);

  /* ── effects ──────────────────────────────────────────────────────────── */
  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedProduct) { setPriceData([]); setProductUrls([]); setProductEdit(EMPTY_PRODUCT_EDIT); return; }
    loadPriceHistory(selectedProduct);
    loadProductUrls(selectedProduct);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProduct]);

  useEffect(() => {
    if (!selectedProductData) { setProductEdit(EMPTY_PRODUCT_EDIT); return; }
    setProductEdit({ name: selectedProductData.name ?? '', group_name: selectedProductData.group_name ?? '' });
  }, [selectedProductData]);

  useEffect(() => {
    const drafts = {};
    productUrls.forEach((link) => { drafts[link.id] = { url: link.url, active: link.active }; });
    setLinkDrafts(drafts);
  }, [productUrls]);

  return {
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
  };
}
