import { useMemo } from 'react';

export function useProductAnalytics({ priceData, timeRange, isDark, selectedProductData }) {
  const filteredData = useMemo(() => {
    if (!priceData.length) {
      return [];
    }

    if (timeRange === 'all') {
      return priceData;
    }

    const now = new Date();
    const days = Number.parseInt(timeRange, 10);

    return priceData.filter((item) => {
      const diff = Math.abs(now - new Date(item.scraped_at));
      return Math.ceil(diff / (1000 * 60 * 60 * 24)) <= days;
    });
  }, [priceData, timeRange]);

  const overallStats = useMemo(() => {
    if (!filteredData.length) {
      return { current: null, min: null, max: null, avg: null };
    }

    const prices = filteredData.map((entry) => Number.parseFloat(entry.price));

    return {
      current: prices[prices.length - 1],
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: prices.reduce((sum, value) => sum + value, 0) / prices.length
    };
  }, [filteredData]);

  const plotData = useMemo(() => {
    if (!filteredData.length) {
      return [];
    }

    const stores = [...new Set(filteredData.map((item) => item.store_name))];
    const lightPalette = ['#2f6fed', '#0f8b6f', '#d98618', '#d9485f', '#6f56d9'];
    const darkPalette = ['#76a7ff', '#3dd6b4', '#ffbd59', '#ff7d94', '#9f8fff'];
    const palette = isDark ? darkPalette : lightPalette;

    return stores.map((store, index) => {
      const storeData = filteredData.filter((item) => item.store_name === store);

      return {
        x: storeData.map((item) => item.scraped_at),
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

  const storeStats = useMemo(() => {
    if (!filteredData.length) {
      return [];
    }

    const grouped = filteredData.reduce((accumulator, item) => {
      const storeName = item.store_name || 'Loja';
      accumulator[storeName] ??= [];
      accumulator[storeName].push(item);
      return accumulator;
    }, {});

    return Object.entries(grouped)
      .map(([storeName, items]) => {
        const prices = items.map((item) => Number.parseFloat(item.price));
        const latest = items[items.length - 1];

        return {
          storeName,
          min: Math.min(...prices),
          max: Math.max(...prices),
          avg: prices.reduce((sum, value) => sum + value, 0) / prices.length,
          samples: items.length,
          latestPrice: Number.parseFloat(latest.price),
          latestUrl: latest.url,
          latestScrapedAt: latest.scraped_at
        };
      })
      .sort((first, second) => first.storeName.localeCompare(second.storeName, 'pt-BR'));
  }, [filteredData]);

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
    storeStats
  };
}
