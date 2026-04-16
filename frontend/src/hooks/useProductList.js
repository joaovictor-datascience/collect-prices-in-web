import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';

import { API_URL } from '../utils/api';

export function useProductList(setNotice) {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [submittingProduct, setSubmittingProduct] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState(false);
  const hasFetchedRef = useRef(false);

  async function loadProducts(preferredProductId) {
    setLoadingProducts(true);
    try {
      const response = await axios.get(`${API_URL}/api/products`);
      if (Array.isArray(response.data)) {
        setProducts(response.data);
        setSelectedProduct((current) => {
          const preferred = preferredProductId ? String(preferredProductId) : null;
          if (preferred && response.data.some((product) => String(product.id) === preferred)) {
            return preferred;
          }
          if (current && response.data.some((product) => String(product.id) === String(current))) {
            return String(current);
          }
          const first = response.data.find((product) => product.active !== false) ?? response.data[0];
          return first ? String(first.id) : '';
        });
      }
    } catch {
      setNotice({ type: 'error', message: 'Não foi possível carregar os produtos.' });
    } finally {
      setLoadingProducts(false);
    }
  }

  async function submitUrlsToProduct(productId, urls) {
    const created = [];
    const duplicated = [];
    const failed = [];

    for (const url of urls) {
      try {
        const response = await axios.post(`${API_URL}/api/products/${productId}/urls`, { url });
        created.push(response.data);
      } catch (error) {
        if (error.response?.status === 409) {
          duplicated.push(url);
        } else {
          failed.push(url);
        }
      }
    }

    return { created, duplicated, failed };
  }

  async function handleProductSubmit(
    { name, group_name, urls, existingMatch },
    { prepareNextAutoFetchSkip, refreshSelectedProductData } = {}
  ) {
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
        const nextSelectedProduct = String(existingMatch.id);
        if (String(selectedProduct) !== nextSelectedProduct) {
          prepareNextAutoFetchSkip?.();
        }
        setSelectedProduct(nextSelectedProduct);
        if (refreshSelectedProductData) {
          await refreshSelectedProductData(existingMatch.id);
        } else {
          await loadProducts(existingMatch.id);
        }

        if (result.created.length) {
          const suffix = result.duplicated.length
            ? ` ${result.duplicated.length} link(s) já existiam.`
            : '';
          setNotice({
            type: 'success',
            message: `${result.created.length} novo(s) link(s) adicionados ao produto existente.${suffix}`
          });
          return true;
        }
        if (result.duplicated.length) {
          setNotice({
            type: 'info',
            message: 'Os links informados já estavam cadastrados para esse produto.'
          });
          return true;
        }
        setNotice({
          type: 'error',
          message: 'Não foi possível adicionar os novos links ao produto existente.'
        });
        return false;
      }

      const response = await axios.post(`${API_URL}/api/products`, {
        name,
        group_name: group_name || null,
        urls
      });
      const nextSelectedProduct = String(response.data.id);
      if (String(selectedProduct) !== nextSelectedProduct) {
        prepareNextAutoFetchSkip?.();
      }
      setSelectedProduct(nextSelectedProduct);
      if (refreshSelectedProductData) {
        await refreshSelectedProductData(response.data.id);
      } else {
        await loadProducts(response.data.id);
      }
      setNotice({ type: 'success', message: 'Produto cadastrado com sucesso.' });
      return true;
    } catch (error) {
      const message = error.response?.data?.error;
      setNotice({ type: 'error', message: message || 'Não foi possível salvar o produto agora.' });
      return false;
    } finally {
      setSubmittingProduct(false);
    }
  }

  async function handleProductDelete(selectedProductData) {
    if (!selectedProductData) {
      return false;
    }

    setDeletingProduct(true);
    try {
      await axios.delete(`${API_URL}/api/products/${selectedProductData.id}`);
      await loadProducts();
      setNotice({ type: 'success', message: 'Produto excluído permanentemente.' });
      return true;
    } catch (error) {
      const message = error.response?.data?.error;
      setNotice({ type: 'error', message: message || 'Não foi possível excluir esse produto.' });
      return false;
    } finally {
      setDeletingProduct(false);
    }
  }

  const selectedProductData = useMemo(
    () => products.find((product) => String(product.id) === String(selectedProduct)),
    [products, selectedProduct]
  );

  const productOptions = useMemo(
    () => [...products].sort((left, right) => {
      const leftLabel = `${left.group_name ?? ''} ${left.name}`.trim();
      const rightLabel = `${right.group_name ?? ''} ${right.name}`.trim();
      return leftLabel.localeCompare(rightLabel, 'pt-BR');
    }),
    [products]
  );

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    loadProducts();
  });

  return {
    products,
    productOptions,
    selectedProduct,
    setSelectedProduct,
    selectedProductData,
    loadingProducts,
    submittingProduct,
    deletingProduct,
    loadProducts,
    handleProductSubmit,
    handleProductDelete
  };
}
