import { useState, useEffect } from 'react';
import { HelpCircle, Check, Loader } from 'lucide-react';
import { getSupportedProviders } from '../../services/api';
import './Supported.css';

export default function Supported() {
  const [providers, setProviders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProviders() {
      try {
        const data = await getSupportedProviders();
        setProviders(data);
      } catch (err) {
        console.error('Failed to load providers:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadProviders();
  }, []);

  return (
    <div className="supported-page card">
      <div className="supported-header">
        <h2 className="page-title">Supported Sources</h2>
        <p className="page-desc">
          MediaFlow parses metadata and extracts video/audio streams from functional public sources.
        </p>
      </div>

      {isLoading ? (
        <div className="loader-container">
          <Loader className="spin" size={32} />
          <span>Loading supported platforms...</span>
        </div>
      ) : (
        <div className="providers-grid">
          {providers.map((p) => (
            <div key={p.id} className="provider-card">
              <div className="provider-info-row">
                <div className="provider-avatar-wrapper">
                  <Check size={20} className="check-icon" />
                </div>
                <div>
                  <h3 className="provider-name">{p.name}</h3>
                  <span className="provider-domains-list">{p.domains}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="legal-boundary-card">
        <HelpCircle className="info-icon" size={24} />
        <div>
          <h4 className="info-title">Acceptable Use Policy</h4>
          <p className="info-desc">
            MediaFlow strictly supports only publicly available content. Circumvention of Digital Rights Management (DRM), authentication bypassing, or accessing private links is strictly disabled.
          </p>
        </div>
      </div>
    </div>
  );
}
