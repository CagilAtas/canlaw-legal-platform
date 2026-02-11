'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { use } from 'react';

interface JurisdictionDetails {
  id: string;
  code: string;
  name: string;
  fullName: string | null;
  jurisdictionType: string;
  isActive: boolean;
  metadata: any;
  _count: {
    legalSources: number;
    slotDefinitions: number;
  };
  legalSources: Array<{
    id: string;
    citation: string;
    sourceType: string;
    aiProcessed: boolean;
    legalDomain: {
      name: string;
      slug: string;
    } | null;
    _count: {
      provisions: number;
      slotDefinitions: number;
    };
  }>;
  domainCoverage: {
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
  allDomainsStatus?: Array<{
    domainId: string;
    domainSlug: string;
    domainName: string;
    domainDescription: string | null;
    hasContent: boolean;
    totalSources: number;
    processedSources: number;
    pendingSources: number;
    totalProvisions: number;
    totalSlots: number;
    activeSlots: number;
    sources: Array<{
      id: string;
      citation: string;
      sourceType: string;
      aiProcessed: boolean;
      provisions: number;
      slots: number;
    }>;
    slots: Array<{
      id: string;
      slotKey: string;
      slotName: string;
      description: string | null;
      slotCategory: string;
      isActive: boolean;
    }>;
  }>;
}

export default function JurisdictionDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [jurisdiction, setJurisdiction] = useState<JurisdictionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scrapingDomain, setScrapingDomain] = useState<string | null>(null);
  const [scrapingProgress, setScrapingProgress] = useState<string>('');

  useEffect(() => {
    loadJurisdiction();
  }, [code]);

  const loadJurisdiction = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/jurisdictions/${code}`);
      if (!response.ok) {
        throw new Error('Jurisdiction not found');
      }
      const data = await response.json();
      setJurisdiction(data.jurisdiction);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFindSources = async (domainSlug: string, domainName: string) => {
    setScrapingDomain(domainSlug);
    setScrapingProgress('🔍 Finding ALL applicable legal sources...');

    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      // Call the API - this will find and scrape ALL applicable sources
      const response = await fetch(`/api/admin/jurisdictions/${code}/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domainSlug }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to find legal sources');
      }

      // Show summary
      const { summary, sources, failedSources } = data;

      if (summary.totalApplicable === 0) {
        setScrapingProgress('❌ No applicable sources found for this domain');
      } else if (summary.newlyScraped === 0 && summary.alreadyExisted > 0) {
        setScrapingProgress(
          `✅ All ${summary.totalApplicable} applicable source(s) already exist in database`
        );
      } else if (summary.newlyScraped > 0) {
        setScrapingProgress(
          `✅ Scraped ${summary.newlyScraped} new source(s)! (${summary.alreadyExisted} already existed)`
        );
      }

      await new Promise(resolve => setTimeout(resolve, 1500));

      // Show details of scraped/existing sources
      if (sources && sources.length > 0) {
        for (const source of sources.slice(0, 3)) {
          setScrapingProgress(
            `📄 ${source.alreadyExisted ? 'Existing' : 'Scraped'}: ${source.title} (${source.sections || 0} sections)`
          );
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        if (sources.length > 3) {
          setScrapingProgress(`... and ${sources.length - 3} more source(s)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Show failed sources if any
      if (failedSources && failedSources.length > 0) {
        setScrapingProgress(`⚠️ Warning: ${failedSources.length} source(s) failed to scrape`);
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      // Show cross-domain linking summary
      const allRelevantDomains = new Set();
      sources?.forEach((source: any) => {
        source.relevantDomains?.forEach((domain: string) => allRelevantDomains.add(domain));
      });

      if (allRelevantDomains.size > 1) {
        setScrapingProgress(
          `🔗 Auto-linked to ${allRelevantDomains.size} domains: ${
            Array.from(allRelevantDomains).slice(0, 3).join(', ')
          }${allRelevantDomains.size > 3 ? '...' : ''}`
        );
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      setScrapingProgress('🔄 Updating display...');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Reload jurisdiction data WITHOUT page reload - this keeps menus open
      const refreshResponse = await fetch(`/api/admin/jurisdictions/${code}`);
      const refreshData = await refreshResponse.json();
      setJurisdiction(refreshData.jurisdiction);

      setScrapingProgress('✅ Complete!');
      await new Promise(resolve => setTimeout(resolve, 1000));

      setScrapingDomain(null);
      setScrapingProgress('');
    } catch (error: any) {
      setScrapingProgress(`❌ Error: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      setScrapingDomain(null);
      setScrapingProgress('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
            Loading jurisdiction details...
          </div>
        </div>
      </div>
    );
  }

  if (error || !jurisdiction) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <Link href="/admin/jurisdictions" className="text-sm text-blue-600 hover:text-blue-800 mb-4 inline-block">
            ← Back to Jurisdictions
          </Link>
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-red-600 mb-4">{error || 'Jurisdiction not found'}</p>
            <Link href="/admin/jurisdictions" className="text-blue-600 hover:text-blue-800">
              Return to Jurisdictions List
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const coverage = jurisdiction.domainCoverage;
  const hasFullCoverage = coverage.domainsWithSources === coverage.totalDomains;
  const hasPartialCoverage = coverage.domainsWithSources > 0 && coverage.domainsWithSources < coverage.totalDomains;

  const countryFlag =
    jurisdiction.code.startsWith('CA-') || jurisdiction.code === 'CA' ? '🇨🇦' :
    jurisdiction.code.startsWith('US-') || jurisdiction.code === 'US' ? '🇺🇸' :
    jurisdiction.code.startsWith('GB-') ? '🇬🇧' :
    jurisdiction.code.startsWith('AU-') || jurisdiction.code === 'AU' ? '🇦🇺' :
    jurisdiction.code.startsWith('NZ-') || jurisdiction.code === 'NZ' ? '🇳🇿' :
    '🌍';

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/admin/jurisdictions" className="text-sm text-blue-600 hover:text-blue-800 mb-4 inline-block">
            ← Back to Jurisdictions
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <span className="text-5xl">{countryFlag}</span>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{jurisdiction.name}</h1>
              <p className="text-gray-600">
                <span className="font-mono text-blue-600">{jurisdiction.code}</span>
                {jurisdiction.fullName && jurisdiction.fullName !== jurisdiction.name && (
                  <span className="ml-2">• {jurisdiction.fullName}</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500 mb-1">Legal Sources</div>
            <div className="text-3xl font-bold text-blue-600">{jurisdiction._count.legalSources}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500 mb-1">Slot Definitions</div>
            <div className="text-3xl font-bold text-purple-600">{jurisdiction._count.slotDefinitions}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500 mb-1">Domain Coverage</div>
            <div className="text-3xl font-bold text-green-600">{coverage.coveragePercent}%</div>
            <div className="text-xs text-gray-500 mt-1">{coverage.domainsWithSources} / {coverage.totalDomains} domains</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500 mb-1">Status</div>
            <div className="mt-2">
              {hasFullCoverage && (
                <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800">
                  ✓ Full Coverage
                </span>
              )}
              {hasPartialCoverage && (
                <span className="px-3 py-1 text-sm font-medium rounded-full bg-yellow-100 text-yellow-800">
                  ⚠ Partial Coverage
                </span>
              )}
              {!hasFullCoverage && !hasPartialCoverage && (
                <span className="px-3 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-600">
                  ○ No Coverage
                </span>
              )}
            </div>
          </div>
        </div>

        {/* All Domains Status */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">All Legal Domains</h2>
            <p className="text-sm text-gray-600">Complete list of legal domains and their status in {jurisdiction.name}</p>
          </div>
          <div className="divide-y divide-gray-200">
            {jurisdiction.allDomainsStatus && jurisdiction.allDomainsStatus.length > 0 ? (
              (() => {
                // Group domains by category
                const categorized = jurisdiction.allDomainsStatus.reduce((acc, domain) => {
                  const category = domain.domainName.includes('Employment') || domain.domainName.includes('Wage') || domain.domainName.includes('Workplace') ? 'Employment & Labor' :
                                   domain.domainName.includes('Landlord') || domain.domainName.includes('Eviction') || domain.domainName.includes('Housing') ? 'Housing & Property' :
                                   domain.domainName.includes('Child') || domain.domainName.includes('Divorce') || domain.domainName.includes('Spousal') ? 'Family Law' :
                                   domain.domainName.includes('Consumer') || domain.domainName.includes('Product') || domain.domainName.includes('Debt') ? 'Consumer Rights' :
                                   domain.domainName.includes('Immigration') || domain.domainName.includes('Refugee') ? 'Immigration' :
                                   domain.domainName.includes('Criminal') ? 'Criminal Defense' :
                                   domain.domainName.includes('Business') || domain.domainName.includes('Contract') || domain.domainName.includes('Intellectual') ? 'Business & Commercial' :
                                   'Other';

                  if (!acc[category]) acc[category] = [];
                  acc[category].push(domain);
                  return acc;
                }, {} as Record<string, typeof jurisdiction.allDomainsStatus>);

                const categoryOrder = [
                  'Employment & Labor',
                  'Housing & Property',
                  'Family Law',
                  'Consumer Rights',
                  'Immigration',
                  'Criminal Defense',
                  'Business & Commercial',
                  'Other'
                ];

                return categoryOrder.map(category => {
                  if (!categorized[category] || categorized[category].length === 0) return null;

                  const domainsWithContent = categorized[category].filter(d => d.hasContent).length;

                  return (
                    <details key={category} className="group">
                      {/* Category Header */}
                      <summary className="bg-gray-50 px-6 py-3 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900 inline-flex items-center gap-2">
                            <span className="text-gray-400 group-open:rotate-90 transition-transform">▶</span>
                            {category}
                          </h3>
                          <p className="text-xs text-gray-500 ml-6">
                            {categorized[category].length} {categorized[category].length === 1 ? 'domain' : 'domains'}
                            {domainsWithContent > 0 && ` • ${domainsWithContent} with content`}
                          </p>
                        </div>
                      </summary>

                      {/* Domains in this category */}
                      <div>
                      {categorized[category].map((domain) => (
                <details key={domain.domainId} className="group/domain border-b border-gray-100 last:border-b-0">
                  <summary className="p-6 cursor-pointer hover:bg-gray-50 transition">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-gray-400 group-open/domain:rotate-90 transition-transform inline-block">▶</span>
                          <h4 className="font-semibold text-gray-900 text-base">{domain.domainName}</h4>
                          {domain.hasContent ? (
                            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                              ✓ Has Content
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                              ○ No Content
                            </span>
                          )}
                        </div>
                        {domain.domainDescription && (
                          <p className="text-sm text-gray-600 mb-2 ml-6">{domain.domainDescription}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-gray-500 ml-6">
                          <span className="font-mono">{domain.domainSlug}</span>
                          {domain.hasContent && (
                            <>
                              <span>•</span>
                              <span>{domain.totalSources} {domain.totalSources === 1 ? 'source' : 'sources'}</span>
                              <span>•</span>
                              <span>{domain.totalProvisions} {domain.totalProvisions === 1 ? 'provision' : 'provisions'}</span>
                              <span>•</span>
                              <span>{domain.totalSlots} {domain.totalSlots === 1 ? 'slot' : 'slots'}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="ml-4 flex items-center gap-2">
                        {domain.hasContent && (
                          <>
                            {domain.processedSources > 0 && (
                              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                                {domain.processedSources} processed
                              </span>
                            )}
                            {domain.pendingSources > 0 && (
                              <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                                {domain.pendingSources} pending
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </summary>

                  {/* Content under this domain */}
                  <div className="px-6 pb-6">
                    <div className="ml-6 space-y-4">
                      {/* Find Sources Button */}
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleFindSources(domain.domainSlug, domain.domainName)}
                          disabled={scrapingDomain === domain.domainSlug}
                          className={`px-4 py-2 text-sm font-medium rounded-lg transition inline-flex items-center gap-2 ${
                            scrapingDomain === domain.domainSlug
                              ? 'bg-gray-400 text-white cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          <span>{scrapingDomain === domain.domainSlug ? '⏳' : '🔍'}</span>
                          <span>
                            {scrapingDomain === domain.domainSlug ? 'Scraping...' : 'Find Legal Sources'}
                          </span>
                        </button>
                        {scrapingDomain === domain.domainSlug && scrapingProgress && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                              <span className="text-sm text-blue-700">{scrapingProgress}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Sources Section */}
                      {domain.sources.length > 0 && (
                        <div>
                          <h5 className="text-sm font-semibold text-gray-700 mb-2">Legal Sources ({domain.sources.length})</h5>
                          <div className="pl-4 border-l-2 border-blue-200">
                            <div className="space-y-2">
                              {domain.sources.map((source) => (
                                <div key={source.id} className="bg-gray-50 rounded-lg p-3">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="font-medium text-sm text-gray-900 mb-1">{source.citation}</div>
                                      <div className="flex items-center gap-3 text-xs text-gray-600">
                                        <span className="px-2 py-1 bg-white rounded border border-gray-200">
                                          {source.sourceType}
                                        </span>
                                        <span>{source.provisions} {source.provisions === 1 ? 'provision' : 'provisions'}</span>
                                        <span>•</span>
                                        <span>{source.slots} {source.slots === 1 ? 'slot' : 'slots'}</span>
                                      </div>
                                    </div>
                                    <div className="ml-3 flex items-center gap-2">
                                      {source.aiProcessed ? (
                                        <>
                                          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                            ✓ Processed
                                          </span>
                                          <button
                                            onClick={() => {
                                              window.location.href = `/admin/automation?jurisdiction=${jurisdiction.code}&domain=${domain.domainSlug}&sourceId=${source.id}&action=reprocess`;
                                            }}
                                            className="px-3 py-1 text-xs font-medium bg-purple-600 text-white rounded hover:bg-purple-700 transition"
                                          >
                                            ⚙️ Re-process to Slots
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                                            ⏳ Pending
                                          </span>
                                          <button
                                            onClick={() => {
                                              window.location.href = `/admin/automation?jurisdiction=${jurisdiction.code}&domain=${domain.domainSlug}&sourceId=${source.id}&action=process`;
                                            }}
                                            className="px-3 py-1 text-xs font-medium bg-purple-600 text-white rounded hover:bg-purple-700 transition"
                                          >
                                            ⚙️ Process to Slots
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Slot Definitions Section */}
                      {domain.slots.length > 0 && (
                        <div>
                          <h5 className="text-sm font-semibold text-gray-700 mb-2">Slot Definitions ({domain.slots.length})</h5>
                          <div className="pl-4 border-l-2 border-purple-200">
                            <div className="space-y-2">
                              {domain.slots.map((slot) => (
                                <div key={slot.id} className="bg-purple-50 rounded-lg p-3">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="font-medium text-sm text-gray-900 mb-1">{slot.slotName}</div>
                                      {slot.description && (
                                        <p className="text-xs text-gray-600 mb-2">{slot.description}</p>
                                      )}
                                      <div className="flex items-center gap-3 text-xs text-gray-600">
                                        <span className="px-2 py-1 bg-white rounded border border-purple-200 font-mono">
                                          {slot.slotKey}
                                        </span>
                                        <span className="px-2 py-1 bg-white rounded border border-purple-200">
                                          {slot.slotCategory}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="ml-3">
                                      {slot.isActive ? (
                                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                          ✓ Active
                                        </span>
                                      ) : (
                                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                                          ○ Inactive
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* No Content Message */}
                      {domain.sources.length === 0 && domain.slots.length === 0 && (
                        <div className="text-sm text-gray-500 italic">
                          No legal sources or slot definitions for this domain yet.
                        </div>
                      )}
                    </div>
                  </div>
                </details>
              ))}
                      </div>
                    </details>
                  );
                });
              })()
            ) : (
              <div className="p-12 text-center text-gray-500">
                <p>No domain information available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
