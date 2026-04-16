import { useMemo } from 'react';
import Plotly from 'plotly.js-basic-dist';
import createPlotlyComponent from 'react-plotly.js/factory';
import { Activity, RefreshCcw } from 'lucide-react';

import { EmptyPanel } from './EmptyPanel';

const plotlyFactory = createPlotlyComponent.default;
const Plot = plotlyFactory(Plotly);


export function ProductChart({
  filteredData,
  isDark,
  loadingHistory,
  selectedProductData,
  timeRange
}) {
  const isLargeRange = timeRange === '90' || timeRange === 'all';
  const tickFormat = isLargeRange ? '%m/%Y' : '%d/%m';

  const plotData = useMemo(() => {
    if (!filteredData?.length) {
      return [];
    }

    const stores = [...new Set(filteredData.map((item) => item.store_name || 'Loja'))];
    const lightPalette = ['#2f6fed', '#0f8b6f', '#d98618', '#d9485f', '#6f56d9'];
    const darkPalette = ['#76a7ff', '#3dd6b4', '#ffbd59', '#ff7d94', '#9f8fff'];
    const palette = isDark ? darkPalette : lightPalette;

    return stores.map((store, index) => {
      const storeData = filteredData.filter((item) => (item.store_name || 'Loja') === store);

      return {
        x: storeData.map((item) => {
          const date = new Date(item.scraped_at);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hour = String(date.getHours()).padStart(2, '0');
          const minute = String(date.getMinutes()).padStart(2, '0');
          const second = String(date.getSeconds()).padStart(2, '0');
          return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
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
        hovertemplate: 'Data: %{x|%d/%m/%Y %H:%M}<br>Preço: R$ %{y:.2f}<extra></extra>'
      };
    });
  }, [filteredData, isDark]);

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Histórico</p>
          <h2>Preço por loja</h2>
        </div>
        {selectedProductData?.group_name && (
          <span className="pill">{selectedProductData.group_name}</span>
        )}
      </div>

      {loadingHistory ? (
        <EmptyPanel
          icon={<RefreshCcw size={40} />}
          title="Carregando histórico"
          description="Estamos buscando as últimas capturas desse produto."
        />
      ) : filteredData.length ? (
        <Plot
          data={plotData}
          layout={{
            autosize: true,
            margin: { l: 58, r: 18, b: 56, t: 20, pad: 4 },
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            font: {
              color: isDark ? '#edf2ff' : '#1f2937',
              family: '"Avenir Next", "Segoe UI", sans-serif'
            },
            xaxis: {
              title: '',
              showgrid: false,
              tickformat: tickFormat,
              color: isDark ? '#cbd5e1' : '#4b5563'
            },
            yaxis: {
              title: 'Preço (R$)',
              showgrid: true,
              gridcolor: isDark ? 'rgba(148,163,184,0.18)' : 'rgba(71,85,105,0.16)',
              tickprefix: 'R$ ',
              color: isDark ? '#cbd5e1' : '#4b5563'
            },
            legend: {
              orientation: 'h',
              y: -0.25,
              font: { color: isDark ? '#e2e8f0' : '#475569' }
            }
          }}
          className="chart-plot"
          config={{ displayModeBar: false, responsive: true }}
          useResizeHandler
        />
      ) : (
        <EmptyPanel
          icon={<Activity size={40} />}
          title="Sem dados para o período"
          description="Altere o período ou selecione outro produto para visualizar capturas disponíveis."
        />
      )}
    </section>
  );
}
