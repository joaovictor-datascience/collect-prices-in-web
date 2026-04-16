import { useEffect, useState } from 'react';
import axios from 'axios';

import { API_URL } from '../utils/api';

const EMPTY_ANALYTICS = {
  filteredData: [],
  overallStats: { current: null, min: null, max: null, avg: null },
  storeStats: []
};


export function useProductAnalytics({ selectedProductData, timeRange, storeFilter }) {
  const [analyticsData, setAnalyticsData] = useState(EMPTY_ANALYTICS);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  async function fetchAnalytics() {
    if (!selectedProductData?.id) {
      setAnalyticsData(EMPTY_ANALYTICS);
      return;
    }

    setLoadingAnalytics(true);
    try {
      const response = await axios.get(
        `${API_URL}/api/analytics/${selectedProductData.id}?days=${timeRange}&store=${encodeURIComponent(storeFilter || 'all')}`
      );
      setAnalyticsData(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setAnalyticsData(EMPTY_ANALYTICS);
    } finally {
      setLoadingAnalytics(false);
    }
  }

  useEffect(() => {
    fetchAnalytics();
  }, [selectedProductData?.id, timeRange, storeFilter]); // fetchAnalytics is omitted – deps listed control when to refetch

  const selectedProductLabel = selectedProductData
    ? selectedProductData.group_name
      ? `${selectedProductData.group_name} / ${selectedProductData.name}`
      : selectedProductData.name
    : 'Selecione um produto';

  return {
    filteredData: analyticsData.filteredData,
    overallStats: analyticsData.overallStats,
    selectedProductLabel,
    storeStats: analyticsData.storeStats,
    loadingAnalytics,
    refetchAnalytics: fetchAnalytics
  };
}
