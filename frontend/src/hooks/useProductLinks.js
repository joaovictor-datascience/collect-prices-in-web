import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';

import { API_URL } from '../utils/api';

export function useProductLinks({ selectedProduct, setNotice }) {
  const [productUrls, setProductUrls] = useState([]);
  const [newLink, setNewLink] = useState('');
  const [linkDrafts, setLinkDrafts] = useState({});
  const [loadingUrls, setLoadingUrls] = useState(false);
  const [submittingLink, setSubmittingLink] = useState(false);
  const [savingLinkId, setSavingLinkId] = useState(null);
  const [deletingLinkId, setDeletingLinkId] = useState(null);
  const skipNextAutoFetchRef = useRef(false);

  async function loadProductUrls(productId = selectedProduct) {
    if (!productId) {
      setProductUrls([]);
      setLinkDrafts({});
      return;
    }

    setLoadingUrls(true);
    try {
      const response = await axios.get(`${API_URL}/api/products/${productId}/urls`);
      setProductUrls(Array.isArray(response.data) ? response.data : []);
    } catch {
      setProductUrls([]);
      setNotice({ type: 'error', message: 'Não foi possível carregar os links do produto.' });
    } finally {
      setLoadingUrls(false);
    }
  }

  async function handleAddLink() {
    if (!selectedProduct) {
      return;
    }

    const trimmedLink = newLink.trim();
    if (!trimmedLink) {
      setNotice({ type: 'error', message: 'Informe um link válido para adicionar.' });
      return;
    }

    setSubmittingLink(true);
    try {
      const response = await axios.post(`${API_URL}/api/products/${selectedProduct}/urls`, {
        url: trimmedLink
      });
      setNewLink('');
      setProductUrls((current) => [...current, response.data]);
      setNotice({ type: 'success', message: 'Novo link adicionado ao produto.' });
    } catch (error) {
      const message = error.response?.data?.error;
      setNotice({ type: 'error', message: message || 'Não foi possível adicionar o novo link.' });
    } finally {
      setSubmittingLink(false);
    }
  }

  async function handleSaveLink(linkId) {
    const draft = linkDrafts[linkId];
    if (!draft?.url?.trim()) {
      setNotice({ type: 'error', message: 'O link não pode ficar vazio.' });
      return;
    }

    setSavingLinkId(linkId);
    try {
      const response = await axios.put(`${API_URL}/api/urls/${linkId}`, {
        url: draft.url.trim(),
        active: draft.active
      });
      setProductUrls((current) =>
        current.map((link) => (link.id === linkId ? response.data : link))
      );
      setLinkDrafts((current) => ({
        ...current,
        [linkId]: { url: response.data.url, active: response.data.active }
      }));
      setNotice({ type: 'success', message: 'Link atualizado com sucesso.' });
    } catch (error) {
      const message = error.response?.data?.error;
      setNotice({ type: 'error', message: message || 'Não foi possível atualizar esse link.' });
    } finally {
      setSavingLinkId(null);
    }
  }

  async function handleDeleteLink(linkId) {
    setDeletingLinkId(linkId);
    try {
      await axios.delete(`${API_URL}/api/urls/${linkId}`);
      setProductUrls((current) => current.filter((link) => link.id !== linkId));
      setLinkDrafts((current) => {
        const nextDrafts = { ...current };
        delete nextDrafts[linkId];
        return nextDrafts;
      });
      setNotice({ type: 'success', message: 'Link excluído com sucesso.' });
      return true;
    } catch (error) {
      const message = error.response?.data?.error;
      setNotice({ type: 'error', message: message || 'Não foi possível excluir esse link.' });
      return false;
    } finally {
      setDeletingLinkId(null);
    }
  }

  function updateLinkDraft(linkId, field, value) {
    setLinkDrafts((current) => ({
      ...current,
      [linkId]: {
        ...current[linkId],
        [field]: value
      }
    }));
  }

  const linksSummary = useMemo(() => {
    const active = productUrls.filter((link) => link.active).length;
    return { active, inactive: productUrls.length - active };
  }, [productUrls]);

  useEffect(() => {
    if (!selectedProduct) {
      setProductUrls([]);
      setNewLink('');
      setLinkDrafts({});
      return;
    }

    if (skipNextAutoFetchRef.current) {
      skipNextAutoFetchRef.current = false;
      return;
    }

    loadProductUrls(selectedProduct);
  }, [selectedProduct]); // loadProductUrls is omitted – the explicit argument makes the dep on selectedProduct sufficient

  useEffect(() => {
    const drafts = {};
    productUrls.forEach((link) => {
      drafts[link.id] = { url: link.url, active: link.active };
    });
    setLinkDrafts(drafts);
  }, [productUrls]);

  return {
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
  };
}
