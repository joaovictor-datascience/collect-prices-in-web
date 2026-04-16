import { useEffect, useState } from 'react';
import axios from 'axios';

import { API_URL } from '../utils/api';

const EMPTY_PRODUCT_EDIT = { name: '', group_name: '' };


export function useProductEdit({ selectedProductData, setNotice }) {
  const [productEdit, setProductEdit] = useState(EMPTY_PRODUCT_EDIT);
  const [savingProduct, setSavingProduct] = useState(false);

  function updateProductEditField(field, value) {
    setProductEdit((current) => ({ ...current, [field]: value }));
  }

  async function handleProductUpdate(loadProducts) {
    if (!selectedProductData) {
      return false;
    }

    const payload = {
      name: productEdit.name.trim(),
      group_name: productEdit.group_name.trim() || null
    };

    setSavingProduct(true);
    try {
      await axios.put(`${API_URL}/api/products/${selectedProductData.id}`, payload);
      await loadProducts?.(selectedProductData.id);
      setNotice({ type: 'success', message: 'Dados do produto atualizados.' });
      return true;
    } catch (error) {
      const message = error.response?.data?.error;
      setNotice({ type: 'error', message: message || 'Não foi possível atualizar o produto.' });
      return false;
    } finally {
      setSavingProduct(false);
    }
  }

  useEffect(() => {
    if (!selectedProductData) {
      setProductEdit(EMPTY_PRODUCT_EDIT);
      return;
    }

    setProductEdit({
      name: selectedProductData.name ?? '',
      group_name: selectedProductData.group_name ?? ''
    });
  }, [selectedProductData]);

  return {
    productEdit,
    savingProduct,
    updateProductEditField,
    handleProductUpdate
  };
}
