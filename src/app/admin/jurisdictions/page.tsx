'use client';

import { useState, useEffect } from 'react';

interface Jurisdiction {
  id: string;
  code: string;
  name: string;
  fullName: string | null;
  jurisdictionType: string;
  isActive: boolean;
  _count?: {
    legalSources: number;
  };
  domainCoverage?: {
    domainsWithSources: number;
    totalDomains: number;
    coveragePercent: number;
    domainDetails: Array<{
      domainId: string;
      domainSlug?: string;
      domainName?: string;
      sourceCount: number;
    }>;
  };
}

export default function JurisdictionsPage() {
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [addingNew, setAddingNew] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');

  useEffect(() => {
    loadJurisdictions();
  }, []);

  const loadJurisdictions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/jurisdictions');
      const data = await response.json();
      setJurisdictions(data.jurisdictions || []);
    } catch (error) {
      console.error('Failed to load jurisdictions:', error);
    } finally {
      setLoading(false);
    }
  };

  const addJurisdictionWithAI = async () => {
    if (!aiPrompt.trim()) return;

    setAddingNew(true);
    setAiResponse('');

    try {
      const response = await fetch('/api/admin/jurisdictions/add-with-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt })
      });

      const data = await response.json();

      if (data.success) {
        setAiResponse(`✅ Successfully added ${data.added} jurisdiction(s):\n${data.jurisdictions.map((j: any) => `  • ${j.name} (${j.code})`).join('\n')}`);
        setAiPrompt('');
        await loadJurisdictions();
      } else {
        setAiResponse(`❌ Error: ${data.error}`);
      }
    } catch (error: any) {
      setAiResponse(`❌ Failed: ${error.message}`);
    } finally {
      setAddingNew(false);
    }
  };

  const filteredJurisdictions = jurisdictions.filter(j => {
    const matchesFilter = filter === 'all' || j.jurisdictionType === filter;
    const matchesSearch = searchTerm === '' ||
      j.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const statsByType = jurisdictions.reduce((acc, j) => {
    acc[j.jurisdictionType] = (acc[j.jurisdictionType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Group jurisdictions by country
  const jurisdictionsByCountry = filteredJurisdictions.reduce((acc, j) => {
    let country = 'Other';

    if (j.code.startsWith('CA-') || j.code === 'CA') {
      country = 'Canada';
    } else if (j.code.startsWith('US-') || j.code === 'US') {
      country = 'United States';
    } else if (j.code.startsWith('GB-')) {
      country = 'United Kingdom';
    } else if (j.code.startsWith('AU-') || j.code === 'AU') {
      country = 'Australia';
    } else if (j.code.startsWith('NZ-') || j.code === 'NZ') {
      country = 'New Zealand';
    }

    if (!acc[country]) acc[country] = [];
    acc[country].push(j);
    return acc;
  }, {} as Record<string, Jurisdiction[]>);

  // Sort countries and jurisdictions within each country
  const sortedCountries = Object.keys(jurisdictionsByCountry).sort((a, b) => {
    // Priority order: Canada, United States, United Kingdom, Australia, then alphabetical
    const priority: Record<string, number> = {
      'Canada': 1,
      'United States': 2,
      'United Kingdom': 3,
      'Australia': 4,
      'New Zealand': 5
    };
    return (priority[a] || 99) - (priority[b] || 99);
  });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Jurisdictions Management</h1>
          <p className="text-gray-600">Manage geographic jurisdictions for legal knowledge base</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-blue-600">{jurisdictions.length}</div>
            <div className="text-sm text-gray-600">Total Jurisdictions</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-green-600">{statsByType.federal || 0}</div>
            <div className="text-sm text-gray-600">Federal</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-purple-600">{statsByType.provincial || 0}</div>
            <div className="text-sm text-gray-600">Provincial</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-orange-600">{statsByType.state || 0}</div>
            <div className="text-sm text-gray-600">State</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-indigo-600">{statsByType.country || 0}</div>
            <div className="text-sm text-gray-600">Country</div>
          </div>
        </div>

        {/* AI-Powered Add Section */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-6 mb-8 text-white">
          <h2 className="text-xl font-bold mb-4">🤖 Add Jurisdictions with AI</h2>
          <p className="mb-4 text-blue-100">
            Describe which jurisdictions you want to add, and AI will create them with proper codes and metadata.
          </p>

          <div className="bg-white/10 rounded-lg p-4 mb-4">
            <div className="text-sm font-semibold mb-2">Example prompts:</div>
            <div className="text-sm space-y-1 text-blue-100">
              <div>• "Add all US states"</div>
              <div>• "Add the three territories of Canada"</div>
              <div>• "Add New Zealand as a federal jurisdiction"</div>
              <div>• "Add all provinces of South Africa"</div>
            </div>
          </div>

          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Example: Add all Australian states and territories"
            className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-blue-200 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 mb-4"
            rows={3}
          />

          <button
            onClick={addJurisdictionWithAI}
            disabled={addingNew || !aiPrompt.trim()}
            className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {addingNew ? '🤖 AI is working...' : '✨ Generate with AI'}
          </button>

          {aiResponse && (
            <div className="mt-4 p-4 bg-white/20 rounded-lg">
              <pre className="text-sm whitespace-pre-wrap font-mono">{aiResponse}</pre>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or code..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Type</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium bg-white"
              >
                <option value="all">All Types ({jurisdictions.length})</option>
                <option value="federal">Federal ({statsByType.federal || 0})</option>
                <option value="provincial">Provincial ({statsByType.provincial || 0})</option>
                <option value="state">State ({statsByType.state || 0})</option>
                <option value="territorial">Territorial ({statsByType.territorial || 0})</option>
                <option value="country">Country ({statsByType.country || 0})</option>
              </select>
            </div>
          </div>
        </div>

        {/* Jurisdictions Organized by Country */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
            Loading jurisdictions...
          </div>
        ) : filteredJurisdictions.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
            No jurisdictions found
          </div>
        ) : (
          <div className="space-y-6">
            {sortedCountries.map((country) => {
              const countryJurisdictions = jurisdictionsByCountry[country].sort((a, b) => {
                // Federal first, then alphabetical
                if (a.jurisdictionType === 'federal') return -1;
                if (b.jurisdictionType === 'federal') return 1;
                return a.name.localeCompare(b.name);
              });

              const countryFlag =
                country === 'Canada' ? '🇨🇦' :
                country === 'United States' ? '🇺🇸' :
                country === 'United Kingdom' ? '🇬🇧' :
                country === 'Australia' ? '🇦🇺' :
                country === 'New Zealand' ? '🇳🇿' :
                '🌍';

              const totalSources = countryJurisdictions.reduce((sum, j) => sum + (j._count?.legalSources || 0), 0);

              return (
                <div key={country} className="bg-white rounded-lg shadow overflow-hidden">
                  {/* Country Header */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-blue-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{countryFlag}</span>
                        <div>
                          <h2 className="text-xl font-bold text-gray-900">{country}</h2>
                          <p className="text-sm text-gray-600">
                            {countryJurisdictions.length} jurisdiction{countryJurisdictions.length !== 1 ? 's' : ''}
                            {totalSources > 0 && ` • ${totalSources} legal source${totalSources !== 1 ? 's' : ''}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Jurisdictions Table */}
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Domain Coverage</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sources</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {countryJurisdictions.map((jurisdiction) => {
                        const coverage = jurisdiction.domainCoverage;
                        const hasFullCoverage = coverage && coverage.domainsWithSources === coverage.totalDomains;
                        const hasPartialCoverage = coverage && coverage.domainsWithSources > 0 && coverage.domainsWithSources < coverage.totalDomains;
                        const hasNoCoverage = !coverage || coverage.domainsWithSources === 0;

                        return (
                          <tr
                            key={jurisdiction.id}
                            onClick={() => window.location.href = `/admin/jurisdictions/${jurisdiction.code}`}
                            className="hover:bg-blue-50 transition cursor-pointer"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="font-mono text-sm font-semibold text-blue-600">
                                {jurisdiction.code}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">{jurisdiction.name}</div>
                              {jurisdiction.fullName && jurisdiction.fullName !== jurisdiction.name && (
                                <div className="text-xs text-gray-500">{jurisdiction.fullName}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                jurisdiction.jurisdictionType === 'federal' ? 'bg-green-100 text-green-800' :
                                jurisdiction.jurisdictionType === 'provincial' ? 'bg-purple-100 text-purple-800' :
                                jurisdiction.jurisdictionType === 'state' ? 'bg-orange-100 text-orange-800' :
                                jurisdiction.jurisdictionType === 'territorial' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {jurisdiction.jurisdictionType}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {coverage ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    {hasFullCoverage && (
                                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                        ✓ Full Coverage
                                      </span>
                                    )}
                                    {hasPartialCoverage && (
                                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                                        ⚠ Partial Coverage
                                      </span>
                                    )}
                                    {hasNoCoverage && (
                                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                                        ○ No Coverage
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    {coverage.domainsWithSources} / {coverage.totalDomains} domains ({coverage.coveragePercent}%)
                                  </div>
                                  {coverage.domainDetails.length > 0 && (
                                    <details className="text-xs text-gray-500 mt-1">
                                      <summary className="cursor-pointer hover:text-blue-600">
                                        View domains ({coverage.domainDetails.length})
                                      </summary>
                                      <div className="mt-2 space-y-1 pl-3 border-l-2 border-gray-200">
                                        {coverage.domainDetails.map((detail, idx) => (
                                          <div key={idx} className="flex justify-between">
                                            <span className="text-gray-700">{detail.domainName}</span>
                                            <span className="text-gray-500 ml-2">({detail.sourceCount} {detail.sourceCount === 1 ? 'source' : 'sources'})</span>
                                          </div>
                                        ))}
                                      </div>
                                    </details>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">No data</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {jurisdiction._count?.legalSources || 0} sources
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {jurisdiction.isActive ? (
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                  Active
                                </span>
                              ) : (
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                                  Inactive
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Showing {filteredJurisdictions.length} of {jurisdictions.length} jurisdictions across {sortedCountries.length} {sortedCountries.length === 1 ? 'country' : 'countries'}
          </p>
        </div>
      </div>
    </div>
  );
}
