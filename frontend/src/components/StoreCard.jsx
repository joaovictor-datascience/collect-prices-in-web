import { ExternalLink, Store } from 'lucide-react';
import { formatCurrency } from '../utils/currency';

export function StoreCard({ store, productName }) {
  return (
    <article className="store-card">
      <div className="store-card-header">
        <div>
          <p className="eyebrow">{productName || 'Produto'}</p>
          <h3>{store.storeName}</h3>
        </div>
        <div className="store-badge">
          <Store size={16} />
          {store.samples} leitura(s)
        </div>
      </div>

      <div className="store-stats-list">
        <div>
          <span>Maior preco</span>
          <strong>{formatCurrency(store.max)}</strong>
        </div>
        <div>
          <span>Menor preco</span>
          <strong>{formatCurrency(store.min)}</strong>
        </div>
        <div>
          <span>Media</span>
          <strong>{formatCurrency(store.avg)}</strong>
        </div>
        <div>
          <span>Ultima captura</span>
          <strong>{formatCurrency(store.latestPrice)}</strong>
        </div>
      </div>

      <div className="store-card-footer">
        <span>
          Atualizado em{' '}
          {new Intl.DateTimeFormat('pt-BR', {
            dateStyle: 'short',
            timeStyle: 'short'
          }).format(new Date(store.latestScrapedAt))}
        </span>
        {store.latestUrl ? (
          <a href={store.latestUrl} target="_blank" rel="noreferrer" className="inline-link">
            Entrar na loja
            <ExternalLink size={16} />
          </a>
        ) : null}
      </div>
    </article>
  );
}
