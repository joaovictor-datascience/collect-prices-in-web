import PlotlyComponent from 'react-plotly.js';
import { Activity, RefreshCcw } from 'lucide-react';

import { EmptyPanel } from './EmptyPanel';

const Plot = PlotlyComponent.default || PlotlyComponent;

export function ProductChart({
  filteredData,
  plotData,
  isDark,
  loadingHistory,
  selectedProductData,
  timeRange
}) {
  const isLargeRange = timeRange === '90' || timeRange === 'all';
  const tickFormat = isLargeRange ? '%m/%Y' : '%d/%m';

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
              family: '"Space Grotesk", "Avenir Next", "Segoe UI", sans-serif'
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
