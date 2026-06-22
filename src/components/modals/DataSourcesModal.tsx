import React, { useState } from 'react';
import { Database, ExternalLink, Search, X, Copy, Check, Link2, Camera } from 'lucide-react';
import { Modal } from '@/components/ui';

const DATA_SOURCES = [
  { name: 'EBS Inventory Orgs Data', id: '1e59b20a-b2e0-4860-aeba-113a31976da6', category: 'EBS' },
  { name: 'Supply Chain Analytics – EBS Orders Detail', id: '21beb67c-4644-4ff5-8104-caf00ce0afcf', category: 'Analytics' },
  { name: 'EBS MTL ABC Assignments', id: '635b0730-93a0-4bd1-b95e-9f4a12dda224', category: 'EBS' },
  { name: 'EBS Cancelled Orders Data', id: '78c0e0a5-7680-4947-b495-7395fc7c190c', category: 'EBS' },
  { name: 'BISSELL Core Product Attributes', id: 'b01c648f-a746-447b-9561-7b7422bd7738', category: 'BISSELL' },
  { name: 'SCM Item Attributes', id: 'b54641ed-c29a-415a-a94e-71bc1be40626', category: 'SCM' },
  { name: 'EBS Shipping Tables', id: 'fb8ac0f7-25a2-4f51-bf55-8542459aeaf6', category: 'EBS' },
  { name: 'Global Systems Reporting Hierarchy', id: 'ec6145ca-db93-4f4b-9997-2bc0cd1df314', category: 'Global' },
  { name: 'Network Analysis – Ship From Scenarios', id: 'da1e2e74-0cb7-4789-bffa-97912470b617', category: 'Network' },
  { name: 'Network Analysis – DC Mapping × 3-ZIP × Channel', id: 'e2502e1b-ae78-454a-8c7e-7ff12adb6de0', category: 'Network' },
  { name: 'Delivery Performance Automated Conv Part', id: '55a6834c-677e-426b-ab4f-9d3588872a89', category: 'Delivery' },
  { name: 'FedEx – 3-ZIP to 3-ZIP and Zone (Corrected)', id: '0e565354-9928-461b-8eff-9f958b62e6d6', category: 'Rates' },
  { name: '2025 USA Container Delivery Data', id: '35d55f68-fa41-4817-96b0-131cecbaaea9', category: 'Delivery' },
  { name: 'BISSELL 2026 FedEx Net Rates', id: '4632cf23-95a0-4728-b80d-45c001ae9e1e', category: 'Rates' },
  { name: 'US DC Capacity Details', id: '76be692c-6957-4d5c-94a7-7f997b7d697a', category: 'Network' },
  { name: 'Fulfillment Rates', id: 'b4946b1d-5363-487c-8ff3-a3ac29373af9', category: 'Rates' },
  { name: '2025 OTM Datasets', id: 'cd68a93d-ece8-4670-ab2c-77015a4176ed', category: 'Analytics' },
  { name: 'Ocean Rates by Lane (10.22.25)', id: 'ceac8f56-606b-4ba2-98d7-352171f519f8', category: 'Rates' },
] as const;



const DOMO_BASE = 'https://bissell.domo.com/datasources';

interface DataSourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DataSourcesModal: React.FC<DataSourcesModalProps> = ({ isOpen, onClose }) => {
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = DATA_SOURCES.filter(
    (ds) =>
      ds.name.toLowerCase().includes(search.toLowerCase()) ||
      ds.category.toLowerCase().includes(search.toLowerCase()) ||
      ds.id.toLowerCase().includes(search.toLowerCase()),
  );

  const handleViewOnDomo = (e: React.MouseEvent, targetUrl: string) => {
    e.preventDefault();
    try {
      if (window.top) {
        window.top.location.href = targetUrl;
        return;
      }
    } catch {
      // fall through
    }
    window.location.href = targetUrl;
  };

  const handleCopyLink = (e: React.MouseEvent, targetUrl: string, id: string) => {
    e.preventDefault();
    try {
      const textarea = document.createElement('textarea');
      textarea.value = targetUrl;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      alert('Copy failed. Please open the link manually.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Data Sources" size="large">
      {/* Search bar */}
      <div className="mb-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, category, or dataset ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 pl-9 pr-9 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <p className="mt-1.5 text-xs text-slate-400">
          {filtered.length} of {DATA_SOURCES.length} data sources — click any row to open in Domo
        </p>
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-xl border border-slate-200/70 shadow-sm" style={{ maxHeight: '480px' }}>
        <table className="min-w-full table-auto">
          <thead className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-500 w-1/2">
                Data Source
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                Dataset ID
              </th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-slate-500 w-28">
                Open
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-sm text-slate-400">
                  No data sources match your search.
                </td>
              </tr>
            ) : (
              filtered.map((ds) => {
                const href = `${DOMO_BASE}/${ds.id}/details/overview`;
                return (
                  // we use handleViewOnDomo to navigate using window.top.location.href
                  <tr key={ds.id} className="group transition-colors hover:bg-blue-50/60">
                    <td className="px-4 py-3.5">
                      <button
                        onClick={(e) => handleViewOnDomo(e, href)}
                        className="flex items-center gap-2.5 bg-transparent border-none p-0 cursor-pointer text-left w-full focus:outline-none"
                      >
                        <div className="flex-shrink-0 h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                          <Database className="h-3.5 w-3.5 text-white" />
                        </div>
                        <span className="text-sm font-medium text-slate-800 group-hover:text-blue-700 transition-colors">
                          {ds.name}
                        </span>
                      </button>
                    </td>

                    <td className="px-4 py-3.5">
                      <code className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 font-mono tracking-tight">
                        {ds.id}
                      </code>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <div className="tooltip-container relative flex items-center justify-center">
                          <button
                            type="button"
                            onClick={(e) => handleCopyLink(e, href, ds.id)}
                            aria-label={`Copy link for ${ds.name}`}
                            className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            {copiedId === ds.id ? (
                              <Check className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                          <div className="tooltip-premium bg-slate-950 text-white text-[10px] font-medium py-1 px-2 rounded shadow-md pointer-events-none z-30 whitespace-nowrap">
                            Copy Dataset URL
                          </div>
                        </div>

                        <div className="tooltip-container relative flex items-center justify-center">
                          <button
                            type="button"
                            onClick={(e) => handleViewOnDomo(e, href)}
                            aria-label={`Open ${ds.name} in Domo`}
                            className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                          <div className="tooltip-premium bg-slate-950 text-white text-[10px] font-medium py-1 px-2 rounded shadow-md pointer-events-none z-30 whitespace-nowrap">
                            Open in Domo (Opens in same tab)
                          </div>
                        </div>

                        {/* <div className="tooltip-container relative flex items-center justify-center">
                          <a
                            href={href}
                            target="_top"
                            aria-label={`Open ${ds.name} in same tab natively`}
                            className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center"
                          >
                            <Link2 className="h-4 w-4" />
                          </a>
                          <div className="tooltip-premium bg-slate-950 text-white text-[10px] font-medium py-1 px-2 rounded shadow-md pointer-events-none z-30 whitespace-nowrap">
                            Open Natively (target="_top")
                          </div>
                        </div> */}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* <p className="mt-4 text-center text-xs text-slate-400">
        Left-click to navigate current tab · Ctrl+Click to open in new tab · <span className="font-medium">bissell.domo.com</span>
      </p> */}
    </Modal>
  );
};
