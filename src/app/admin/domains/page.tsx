'use client';

import { useState, useEffect } from 'react';

interface LegalDomain {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
  _count?: {
    legalSources: number;
  };
}

export default function DomainsPage() {
  const [domains, setDomains] = useState<LegalDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [addingNew, setAddingNew] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');

  useEffect(() => {
    loadDomains();
  }, []);

  const loadDomains = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/domains');
      const data = await response.json();
      setDomains(data.domains || []);
    } catch (error) {
      console.error('Failed to load domains:', error);
    } finally {
      setLoading(false);
    }
  };

  const addDomainWithAI = async () => {
    if (!aiPrompt.trim()) return;

    setAddingNew(true);
    setAiResponse('');

    try {
      const response = await fetch('/api/admin/domains/add-with-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt })
      });

      const data = await response.json();

      if (data.success) {
        setAiResponse(`✅ Successfully added ${data.added} legal domain(s):\n${data.domains.map((d: any) => `  • ${d.name} (${d.slug})`).join('\n')}`);
        setAiPrompt('');
        await loadDomains();
      } else {
        setAiResponse(`❌ Error: ${data.error}`);
      }
    } catch (error: any) {
      setAiResponse(`❌ Failed: ${error.message}`);
    } finally {
      setAddingNew(false);
    }
  };

  const filteredDomains = domains.filter(d =>
    searchTerm === '' ||
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.description && d.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Group by category
  const categorized = filteredDomains.reduce((acc, domain) => {
    const category = domain.name.includes('Employment') || domain.name.includes('Wage') || domain.name.includes('Workplace') ? 'Employment & Labor' :
                     domain.name.includes('Landlord') || domain.name.includes('Eviction') || domain.name.includes('Housing') ? 'Housing & Property' :
                     domain.name.includes('Child') || domain.name.includes('Divorce') || domain.name.includes('Spousal') ? 'Family Law' :
                     domain.name.includes('Consumer') || domain.name.includes('Product') || domain.name.includes('Debt') ? 'Consumer Rights' :
                     domain.name.includes('Immigration') || domain.name.includes('Refugee') ? 'Immigration' :
                     domain.name.includes('Criminal') ? 'Criminal Defense' :
                     domain.name.includes('Business') || domain.name.includes('Contract') ? 'Business & Commercial' :
                     'Other';

    if (!acc[category]) acc[category] = [];
    acc[category].push(domain);
    return acc;
  }, {} as Record<string, LegalDomain[]>);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Legal Domains Management</h1>
          <p className="text-gray-600">Manage practice areas and legal issue categories</p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-blue-600">{domains.length}</div>
            <div className="text-sm text-gray-600">Total Domains</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-green-600">{Object.keys(categorized).length}</div>
            <div className="text-sm text-gray-600">Categories</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-purple-600">
              {domains.reduce((sum, d) => sum + (d._count?.legalSources || 0), 0)}
            </div>
            <div className="text-sm text-gray-600">Total Sources</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-orange-600">
              {domains.filter(d => (d._count?.legalSources || 0) > 0).length}
            </div>
            <div className="text-sm text-gray-600">With Content</div>
          </div>
        </div>

        {/* AI-Powered Add Section */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg shadow-lg p-6 mb-8 text-white">
          <h2 className="text-xl font-bold mb-4">🤖 Add Legal Domains with AI</h2>
          <p className="mb-4 text-purple-100">
            Describe which legal practice areas you want to add, and AI will create them with proper slugs and descriptions.
          </p>

          <div className="bg-white/10 rounded-lg p-4 mb-4">
            <div className="text-sm font-semibold mb-2">Example prompts:</div>
            <div className="text-sm space-y-1 text-purple-100">
              <div>• "Add domains for elder law, guardianship, and estate planning"</div>
              <div>• "Add environmental law and climate litigation domains"</div>
              <div>• "Add domains related to data privacy and cybersecurity"</div>
              <div>• "Add professional licensing and regulatory compliance domains"</div>
            </div>
          </div>

          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Example: Add domains for intellectual property including patents, trademarks, and copyright"
            className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-purple-200 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 mb-4"
            rows={3}
          />

          <button
            onClick={addDomainWithAI}
            disabled={addingNew || !aiPrompt.trim()}
            className="bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-purple-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {addingNew ? '🤖 AI is working...' : '✨ Generate with AI'}
          </button>

          {aiResponse && (
            <div className="mt-4 p-4 bg-white/20 rounded-lg">
              <pre className="text-sm whitespace-pre-wrap font-mono">{aiResponse}</pre>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Search Domains</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, slug, or description..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
          />
        </div>

        {/* Domains by Category */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
            Loading legal domains...
          </div>
        ) : Object.keys(categorized).length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
            No domains found
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(categorized).sort(([a], [b]) => a.localeCompare(b)).map(([category, categoryDomains]) => (
              <div key={category} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-purple-100">
                  <h2 className="text-lg font-bold text-purple-900">{category}</h2>
                  <p className="text-sm text-purple-600">{categoryDomains.length} domain{categoryDomains.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="divide-y divide-gray-200">
                  {categoryDomains.sort((a, b) => a.name.localeCompare(b.name)).map((domain) => (
                    <div key={domain.id} className="p-6 hover:bg-gray-50 transition">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{domain.name}</h3>
                            <span className="px-2 py-1 text-xs font-mono bg-purple-100 text-purple-700 rounded">
                              {domain.slug}
                            </span>
                          </div>
                          {domain.description && (
                            <p className="text-sm text-gray-600 mb-3">{domain.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>📊 {domain._count?.legalSources || 0} legal sources</span>
                            <span>🔢 Sort order: {domain.sortOrder}</span>
                          </div>
                        </div>
                        {(domain._count?.legalSources || 0) > 0 && (
                          <div className="ml-4">
                            <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                              Has Content
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Showing {filteredDomains.length} of {domains.length} legal domains across {Object.keys(categorized).length} categories
          </p>
        </div>
      </div>
    </div>
  );
}
