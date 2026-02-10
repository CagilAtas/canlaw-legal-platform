'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface LegalSource {
  id: string;
  citation: string;
  longTitle: string;
  sourceType: string;
  inForce: boolean;
  scrapedAt: string | null;
  jurisdiction: {
    name: string;
    code: string;
  };
  legalDomain: {
    name: string;
  } | null;
  _count: {
    provisions: number;
  };
}

export default function LegalSourcesPage() {
  const [sources, setSources] = useState<LegalSource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/legal-sources');
      const data = await response.json();
      setSources(data.sources || []);
    } catch (error) {
      console.error('Failed to fetch legal sources:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Legal Sources</h1>
          <p className="mt-1 text-sm text-gray-500">
            Scraped statutes, regulations, and legal documents
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">Loading legal sources...</div>
          </div>
        ) : sources.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <div className="text-gray-500">No legal sources found</div>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {sources.map((source) => (
                <li key={source.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-medium text-gray-900">{source.citation}</h3>
                        <p className="mt-1 text-sm text-gray-600">{source.longTitle}</p>
                        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                          <span>Type: {source.sourceType}</span>
                          <span>Jurisdiction: {source.jurisdiction.code}</span>
                          {source.legalDomain && <span>Domain: {source.legalDomain.name}</span>}
                          <span>Provisions: {source._count.provisions}</span>
                          {source.scrapedAt && (
                            <span>Scraped: {new Date(source.scrapedAt).toLocaleDateString()}</span>
                          )}
                          <span className={source.inForce ? 'text-green-600' : 'text-red-600'}>
                            {source.inForce ? '✓ In Force' : '✗ Not in Force'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
