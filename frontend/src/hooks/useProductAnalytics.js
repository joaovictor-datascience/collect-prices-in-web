import { useMemo, useState, useEffect } from 'react';
import axios from 'axios';

export function useProductAnalytics({ selectedProductData, timeRange, storeFilter, isDark }) {
  const [analyticsData, setAnalyticsData] = useState({
    filteredData: [],
    overallStats: { current: null, min: null, max: null, avg: null },
    storeStats: []
  });
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    fetchAnalytics();
  }, [selectedProductData?.id, timeRange, storeFilter, apiUrl]);

  async function fetchAnalytics() {
    if (!selectedProductData?.id) {
      setAnalyticsData({
        filteredData: [],
        overallStats: { current: null, min: null, max: null, avg: null },
        storeStats: []
      });
      return;
    }
    
    setLoadingAnalytics(true);
    try {
      const response = await axios.get(`${apiUrl}/api/analytics/${selectedProductData.id}?days=${timeRange}&store=${encodeURIComponent(storeFilter || 'all')}`);
      setAnalyticsData(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setAnalyticsData({
        filteredData: [],
        overallStats: { current: null, min: null, max: null, avg: null },
        storeStats: []
      });
    } finally {
      setLoadingAnalytics(false);
    }
  }

  const { filteredData, overallStats, storeStats } = analyticsData;

  const plotData = useMemo(() => {
    if (!filteredData || !filteredData.length) {
      return [];
    }

    const stores = [...new Set(filteredData.map((item) => item.store_name))];
    const lightPalette = ['#2f6fed', '#0f8b6f', '#d98618', '#d9485f', '#6f56d9'];
    const darkPalette = ['#76a7ff', '#3dd6b4', '#ffbd59', '#ff7d94', '#9f8fff'];
    const palette = isDark ? darkPalette : lightPalette;

    return stores.map((store, index) => {
      const storeData = filteredData.filter((item) => item.store_name === store);

      return {
        x: storeData.map((item) => {
          const d = new Date(item.scraped_at);
          const YYYY = d.getFullYear();
          const MM = String(d.getMonth() + 1).padStart(2, '0');
          const DD = String(d.getDate()).padStart(2, '0');
          const HH = String(d.getHours()).padStart(2, '0');
          const mm = String(d.getMinutes()).padStart(2, '0');
          const ss = String(d.getSeconds()).padStart(2, '0');
          return `${YYYY}-${MM}-${DD} ${HH}:${mm}:${ss}`;
        }),
        y: storeData.map((item) => Number.parseFloat(item.price)),
        type: 'scatter',
        mode: 'lines+markers',
        name: store,
        line: { color: palette[index % palette.length], width: 3 },
        marker: {
          size: 7,
          color: palette[index % palette.length],
          line: { color: isDark ? '#0f172a' : '#ffffff', width: 1.5 }
        },
        hovertemplate: 'Data: %{x|%d/%m/%Y %H:%M}<br>Preco: R$ %{y:.2f}<extra></extra>'
      };
    });
  }, [filteredData, isDark]);

  const selectedProductLabel = selectedProductData
    ? selectedProductData.group_name
      ? `${selectedProductData.group_name} / ${selectedProductData.name}`
      : selectedProductData.name
    : 'Selecione um produto';

  return {
    filteredData,
    overallStats,
    plotData,
    selectedProductLabel,
    storeStats,
    loadingAnalytics,
    refetchAnalytics: fetchAnalytics
  };
}
