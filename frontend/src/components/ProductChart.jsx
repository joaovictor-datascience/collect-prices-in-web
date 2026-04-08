import PlotlyComponent from 'react-plotly.js';
import { Activity, RefreshCcw } from 'lucide-react';

import { EmptyPanel } from './EmptyPanel';

const Plot = PlotlyComponent.default || PlotlyComponent;

export function ProductChart({
  filteredData,
  plotData,
  isDark,
  loadingHistory,
  selectedProductData
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Historico</p>
          <h2>Preco por loja</h2>
        </div>
        {selectedProductData?.group_name && (
          <span className="pill">{selectedProductData.group_name}</span>
        )}
      </div>

      {loadingHistory ? (
        <EmptyPanel
          icon={<RefreshCcw size={40} />}
          title="Carregando historico"
          description="Estamos buscando as ultimas capturas desse produto."
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
              tickformat: '%d/%m/%Y',
              color: isDark ? '#cbd5e1' : '#4b5563'
            },
            yaxis: {
              title: 'Preco (R$)',
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
          style={{ width: '100%', height: '430px' }}
          config={{ displayModeBar: false, responsive: true }}
          useResizeHandler
        />
      ) : (
        <EmptyPanel
          icon={<Activity size={40} />}
          title="Sem dados para o periodo"
          description="Altere o periodo ou selecione outro produto para visualizar capturas disponiveis."
        />
      )}
    </section>
  );
}
