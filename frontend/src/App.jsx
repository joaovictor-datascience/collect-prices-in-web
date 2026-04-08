import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import PlotlyComponent from 'react-plotly.js';
import {
  TrendingDown,
  TrendingUp,
  DollarSign,
  Activity,
  Calendar,
  Package
} from 'lucide-react';

const Plot = PlotlyComponent.default || PlotlyComponent;

function App() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [priceData, setPriceData] = useState([]);
  const [timeRange, setTimeRange] = useState('30'); // '7', '30', '60', '90', 'all'

  const apiUrl = import.meta.env.VITE_API_URL;

  // Load the product list once and preselect the first available product.
  useEffect(() => {
    axios.get(`${apiUrl}/api/products`)
      .then(response => {
        // Guard against unexpected API responses.
        if (Array.isArray(response.data)) {
          setProducts(response.data);
          if (response.data.length > 0) {
            setSelectedProduct(response.data[0].id);
          }
        }
      })
      .catch(error => console.error("Error loading products:", error));
  }, [apiUrl]);

  // Refresh the chart data whenever the selected product changes.
  useEffect(() => {
    if (selectedProduct && selectedProduct !== '') {
      axios.get(`${apiUrl}/api/history/${selectedProduct}`)
        .then(response => {
          if (Array.isArray(response.data)) {
            setPriceData(response.data);
          }
        })
        .catch(error => console.error("Error loading price history:", error));
    }
  }, [selectedProduct, apiUrl]);

  // Keep the chart focused on the selected time window.
  const filteredData = useMemo(() => {
    if (!priceData || priceData.length === 0) return [];
    if (timeRange === 'all') return priceData;

    const now = new Date();
    const daysToSubtract = parseInt(timeRange, 10);

    return priceData.filter(item => {
      const itemDate = new Date(item.scraped_at);
      const diffTime = Math.abs(now - itemDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= daysToSubtract;
    });
  }, [priceData, timeRange]);

  // Derive summary metrics from the filtered dataset.
  const stats = useMemo(() => {
    if (filteredData.length === 0) return { current: 0, min: 0, max: 0, avg: 0 };

    // The history endpoint returns ascending dates, so the last value is the latest one.
    const prices = filteredData.map(d => parseFloat(d.price));
    const current = prices[prices.length - 1];
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;

    return { current, min, max, avg };
  }, [filteredData]);

  // Split the series by store so each line can be rendered independently.
  const plotData = useMemo(() => {
    if (filteredData.length === 0) return [];

    const stores = [...new Set(filteredData.map(item => item.store_name))];
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']; // Blue, Green, Amber, Red

    return stores.map((store, index) => {
      const storeData = filteredData.filter(item => item.store_name === store);
      return {
        x: storeData.map(item => item.scraped_at),
        y: storeData.map(item => parseFloat(item.price)),
        type: 'scatter',
        mode: 'lines+markers',
        name: store,
        line: { color: colors[index % colors.length], width: 3 },
        marker: { size: 8 },
        hovertemplate: 'Date: %{x|%d/%m/%Y}<br>Price: BRL %{y:.2f}<extra></extra>',
      };
    });
  }, [filteredData]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const selectedProductData = products.find(p => p.id === parseInt(selectedProduct, 10));
  const selectedProductName = selectedProductData?.name || 'Selecione um produto';
  const selectedProductGroup = selectedProductData?.group_name;
  const getProductLabel = (product) => {
    if (!product.group_name) {
      return product.name;
    }

    return `${product.name}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <Activity size={24} />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Collect prices</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Controls Section */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center mb-8">

          <div className="flex items-center w-full sm:w-auto gap-3">
            <Package className="text-gray-400" />
            <div className="flex flex-col w-full sm:w-80">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Produto</label>
              <select
                value={selectedProduct || ''}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 outline-none transition-all"
              >
                {products.length === 0 && <option value="">Carregando...</option>}
                {products.map(p => (
                  <option key={p.id} value={p.id}>{getProductLabel(p)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center w-full sm:w-auto gap-3">
            <Calendar className="text-gray-400" />
            <div className="flex flex-col w-full sm:w-48">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Período</label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 outline-none transition-all"
              >
                <option value="7">Últimos 7 dias</option>
                <option value="30">Últimos 30 dias</option>
                <option value="60">Últimos 60 dias</option>
                <option value="90">Últimos 90 dias</option>
                <option value="all">Todo o Histórico</option>
              </select>
            </div>
          </div>

        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><DollarSign size={24} /></div>
            <div>
              <p className="text-sm font-medium text-gray-500">Preço Atual</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.current)}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-lg"><TrendingDown size={24} /></div>
            <div>
              <p className="text-sm font-medium text-gray-500">Menor Preço</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.min)}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-3 bg-red-50 text-red-600 rounded-lg"><TrendingUp size={24} /></div>
            <div>
              <p className="text-sm font-medium text-gray-500">Maior Preço</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.max)}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><Activity size={24} /></div>
            <div>
              <p className="text-sm font-medium text-gray-500">Média no Período</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.avg)}</p>
            </div>
          </div>

        </div>

        {/* Chart Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 sm:p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-1 px-4 sm:px-0">Preço Histórico: {selectedProductName}</h2>
          {selectedProductGroup && (
            <p className="text-sm text-gray-500 mb-4 px-4 sm:px-0">Grupo: {selectedProductGroup}</p>
          )}

          {filteredData.length > 0 ? (
            <Plot
              data={plotData}
              layout={{
                autosize: true,
                margin: { l: 60, r: 20, b: 60, t: 20, pad: 4 },
                xaxis: {
                  title: '',
                  showgrid: false,
                  tickformat: '%d/%m/%Y'
                },
                yaxis: {
                  title: 'Preço (R$)',
                  showgrid: true,
                  gridcolor: '#bbbcbdd2',
                  tickprefix: 'R$ '
                },
                plot_bgcolor: 'rgba(0,0,0,0)',
                paper_bgcolor: 'rgba(61, 61, 61, 0)',
                legend: { orientation: 'h', y: -0.2 }
              }}
              useResizeHandler={true}
              style={{ width: "100%", height: "450px" }}
              config={{ displayModeBar: false, responsive: true }}
            />
          ) : (
            <div className="h-[450px] flex flex-col items-center justify-center text-gray-400">
              <Activity size={48} className="mb-4 opacity-50" />
              <p className="text-lg">Nenhum dado encontrado para o período selecionado.</p>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}

export default App;
