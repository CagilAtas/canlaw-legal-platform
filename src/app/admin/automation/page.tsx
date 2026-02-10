'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

interface ProgressData {
  stats: {
    totalSources: number;
    totalProcessed: number;
    totalUnprocessed: number;
    totalSlots: number;
    totalProvisions: number;
  };
  progressByJurisdiction: Record<string, any>;
  progressByDomain: Record<string, any>;
  suggestions: Array<{
    type: string;
    priority: string;
    title: string;
    description: string;
    action: any;
    details: any;
  }>;
  recentSources: any[];
}

export default function AutomationControlPage() {
  const [scraping, setScraping] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [scrapingResult, setScrapingResult] = useState<string | null>(null);
  const [processingResult, setProcessingResult] = useState<string | null>(null);

  // Progress tracking
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(true);

  // Configuration options
  const [selectedJurisdiction, setSelectedJurisdiction] = useState('CA-ON');
  const [selectedDomain, setSelectedDomain] = useState('wrongful-termination');
  const [selectedStatute, setSelectedStatute] = useState('00e41'); // ESA code
  const [batchSize, setBatchSize] = useState('2');
  const [maxSections, setMaxSections] = useState('all');

  // Load progress data
  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      setLoadingProgress(true);
      const response = await fetch('/api/admin/automation/progress');
      const data = await response.json();
      setProgressData(data);
    } catch (error) {
      console.error('Failed to load progress:', error);
    } finally {
      setLoadingProgress(false);
    }
  };

  const applySuggestion = (suggestion: any) => {
    const action = suggestion.action;

    if (action.type === 'scrape' || action.type === 'scrape-new') {
      setSelectedJurisdiction(action.jurisdiction);
      setSelectedStatute(action.statuteCode);
      setSelectedDomain(action.domain);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (action.type === 'process-ai') {
      setSelectedJurisdiction(action.jurisdiction);
      setSelectedDomain(action.domain);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleReprocess = async (sourceId: string, citation: string) => {
    if (!confirm(`This will REPROCESS "${citation}" and regenerate all slots.\n\nExisting slots will be deleted and recreated.\n\nThis may take 10-20 minutes and will use AI credits. Continue?`)) {
      return;
    }

    setProcessing(true);
    setProcessingResult('🔄 Reprocessing...');

    try {
      const response = await fetch('/api/admin/automation/reprocess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId,
          domainSlug: selectedDomain,
          batchSize: parseInt(batchSize),
          deleteExisting: true
        })
      });

      const data = await response.json();

      if (response.ok) {
        setProcessingResult(`✅ Reprocessed ${data.citation}: Generated ${data.totalSlots} new slots`);
        await loadProgress(); // Reload progress data
      } else {
        setProcessingResult(`❌ Reprocessing failed: ${data.error}`);
      }
    } catch (error: any) {
      setProcessingResult(`❌ Error: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleScrape = async () => {
    if (!confirm(`This will scrape ${selectedStatute === '00e41' ? 'Employment Standards Act' : 'the selected statute'} from ontario.ca. This may take 5-10 minutes. Continue?`)) {
      return;
    }

    setScraping(true);
    setScrapingResult(null);

    try {
      const response = await fetch('/api/admin/automation/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jurisdictionCode: selectedJurisdiction,
          domainSlug: selectedDomain,
          statuteCode: selectedStatute,
          maxSections: maxSections === 'all' ? undefined : parseInt(maxSections)
        })
      });

      const data = await response.json();

      if (response.ok) {
        if (data.alreadyExists) {
          setScrapingResult(`ℹ️ ${data.citation} has already been scraped (${data.sections} sections). Use "Process with Claude AI" or "Reprocess" to generate slots.`);
        } else {
          setScrapingResult(`✅ Successfully scraped ${data.sections} sections from ${data.citation}`);
        }
        await loadProgress(); // Reload progress data
      } else {
        setScrapingResult(`❌ Error: ${data.error}`);
      }
    } catch (error: any) {
      setScrapingResult(`❌ Error: ${error.message}`);
    } finally {
      setScraping(false);
    }
  };

  const handleProcessWithAI = async () => {
    if (!confirm(`This will process legal sources with Claude AI (batch size: ${batchSize}). This may take 10-20 minutes and will use AI credits. Continue?`)) {
      return;
    }

    setProcessing(true);
    setProcessingResult(null);

    try {
      const response = await fetch('/api/admin/automation/process-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainSlug: selectedDomain,
          batchSize: parseInt(batchSize)
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Create detailed completion report
        const report = `✅ AI Processing Complete!\n\n` +
          `📚 Source: ${data.citation}\n` +
          `📍 Jurisdiction: ${data.jurisdiction}\n` +
          `⚖️ Domain: ${data.domain || 'N/A'}\n` +
          `📄 Provisions Processed: ${data.provisions}\n\n` +
          `🎯 Results:\n` +
          `• Total Slots Generated: ${data.totalSlots}\n` +
          `• Batches Processed: ${data.batches}\n` +
          `• Average Confidence: ${(data.averageConfidence * 100).toFixed(1)}%\n` +
          `• Slots per Batch: ${data.slotsPerBatch.toFixed(1)}\n\n` +
          `⏰ Completed at: ${new Date(data.processedAt).toLocaleTimeString()}`;

        setProcessingResult(report);
        await loadProgress(); // Reload progress data
      } else {
        if (data.alreadyProcessed) {
          setProcessingResult(`ℹ️ ${data.citation} has already been processed.\n\n${data.message}\n\nProcessed at: ${new Date(data.processedAt).toLocaleString()}`);
        } else {
          setProcessingResult(`❌ Error: ${data.error}`);
        }
      }
    } catch (error: any) {
      setProcessingResult(`❌ Error: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleFullPipeline = async () => {
    if (!confirm(`This will run the FULL pipeline with your selected options:\n\nJurisdiction: ${selectedJurisdiction}\nDomain: ${selectedDomain}\nStatute: ${selectedStatute}\nBatch Size: ${batchSize}\n\nThis may take 20-30 minutes and will use AI credits. Continue?`)) {
      return;
    }

    // Run scraping first
    setScraping(true);
    setScrapingResult('🔄 Scraping...');

    try {
      const scrapeResponse = await fetch('/api/admin/automation/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jurisdictionCode: selectedJurisdiction,
          domainSlug: selectedDomain,
          statuteCode: selectedStatute,
          maxSections: maxSections === 'all' ? undefined : parseInt(maxSections)
        })
      });

      const scrapeData = await scrapeResponse.json();

      if (!scrapeResponse.ok) {
        setScrapingResult(`❌ Scraping failed: ${scrapeData.error}`);
        setScraping(false);
        return;
      }

      if (scrapeData.alreadyExists) {
        setScrapingResult(`ℹ️ Already scraped (${scrapeData.sections} sections). Continuing to AI processing...`);
      } else {
        setScrapingResult(`✅ Scraped ${scrapeData.sections} sections`);
      }
      setScraping(false);

      // Then run AI processing
      setProcessing(true);
      setProcessingResult('🔄 Processing with AI...');

      const processResponse = await fetch('/api/admin/automation/process-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: scrapeData.sourceId,
          domainSlug: selectedDomain,
          batchSize: parseInt(batchSize)
        })
      });

      const processData = await processResponse.json();

      if (!processResponse.ok) {
        if (processData.alreadyProcessed) {
          setProcessingResult(`ℹ️ ${processData.citation} was already processed.\n\n${processData.message}`);
        } else {
          setProcessingResult(`❌ Processing failed: ${processData.error}`);
        }
        setProcessing(false);
        return;
      }

      // Create detailed completion report
      const report = `✅ Full Pipeline Complete!\n\n` +
        `📚 Source: ${processData.citation}\n` +
        `📍 Jurisdiction: ${processData.jurisdiction}\n` +
        `⚖️ Domain: ${processData.domain || 'N/A'}\n` +
        `📄 Provisions Processed: ${processData.provisions}\n\n` +
        `🎯 Results:\n` +
        `• Total Slots Generated: ${processData.totalSlots}\n` +
        `• Batches Processed: ${processData.batches}\n` +
        `• Average Confidence: ${(processData.averageConfidence * 100).toFixed(1)}%\n` +
        `• Slots per Batch: ${processData.slotsPerBatch.toFixed(1)}\n\n` +
        `⏰ Completed at: ${new Date(processData.processedAt).toLocaleTimeString()}`;

      setProcessingResult(report);
      setProcessing(false);
      await loadProgress(); // Reload progress data

    } catch (error: any) {
      setScrapingResult(`❌ Pipeline error: ${error.message}`);
      setScraping(false);
      setProcessing(false);
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
          <h1 className="text-3xl font-bold text-gray-900">Automation Control Panel</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure and run automated scraping and AI processing tasks
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Progress Dashboard */}
        {loadingProgress ? (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="animate-pulse flex space-x-4">
              <div className="flex-1 space-y-4 py-1">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
              </div>
            </div>
          </div>
        ) : progressData && (
          <>
            {/* Overall Stats */}
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">📊 Overall Progress</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-600 font-medium">Total Sources</p>
                  <p className="text-2xl font-bold text-blue-900">{progressData.stats.totalSources}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-600 font-medium">Processed</p>
                  <p className="text-2xl font-bold text-green-900">{progressData.stats.totalProcessed}</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <p className="text-sm text-yellow-600 font-medium">Unprocessed</p>
                  <p className="text-2xl font-bold text-yellow-900">{progressData.stats.totalUnprocessed}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-purple-600 font-medium">Total Slots</p>
                  <p className="text-2xl font-bold text-purple-900">{progressData.stats.totalSlots}</p>
                </div>
                <div className="bg-indigo-50 rounded-lg p-4">
                  <p className="text-sm text-indigo-600 font-medium">Provisions</p>
                  <p className="text-2xl font-bold text-indigo-900">{progressData.stats.totalProvisions}</p>
                </div>
              </div>
            </div>

            {/* Smart Suggestions */}
            {progressData.suggestions && progressData.suggestions.length > 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 shadow rounded-lg p-6 mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">💡 Smart Suggestions</h2>
                <p className="text-sm text-gray-600 mb-4">The system analyzed your progress and recommends:</p>
                <div className="space-y-3">
                  {progressData.suggestions.slice(0, 3).map((suggestion, index) => (
                    <div
                      key={index}
                      className={`bg-white rounded-lg p-4 border-l-4 ${
                        suggestion.priority === 'high' ? 'border-red-500' :
                        suggestion.priority === 'medium' ? 'border-yellow-500' :
                        'border-gray-400'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 flex items-center">
                            {suggestion.priority === 'high' && '🔴 '}
                            {suggestion.priority === 'medium' && '🟡 '}
                            {suggestion.priority === 'low' && '⚪ '}
                            {suggestion.title}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">{suggestion.description}</p>
                          {suggestion.details && (
                            <div className="mt-2 text-xs text-gray-500">
                              {Object.entries(suggestion.details).map(([key, value]) => (
                                <span key={key} className="mr-3">
                                  <strong>{key}:</strong> {String(value)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => applySuggestion(suggestion)}
                          className="ml-4 px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Progress by Jurisdiction */}
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">📍 Progress by Jurisdiction</h2>
              <div className="space-y-4">
                {Object.entries(progressData.progressByJurisdiction).map(([code, data]: [string, any]) => (
                  <div key={code} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-medium text-gray-900">{data.name} ({code})</h3>
                      <span className="text-sm text-gray-500">{data.totalSlots} slots generated</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      {data.statutes.map((statute: any) => (
                        <div
                          key={statute.code}
                          className={`text-xs p-2 rounded border ${
                            statute.aiProcessed ? 'bg-green-50 text-green-800 border-green-200' :
                            statute.scraped ? 'bg-yellow-50 text-yellow-800 border-yellow-200' :
                            'bg-gray-50 text-gray-600 border-gray-200'
                          }`}
                        >
                          <div className="font-medium">{statute.name}</div>
                          <div className="mt-1 mb-2">
                            {statute.aiProcessed ? '✅ Processed' :
                             statute.scraped ? `📚 Scraped (${statute.scrapedSections}/${statute.totalSections})` :
                             '⚪ Not scraped'}
                          </div>
                          {statute.aiProcessed && statute.sourceId && (
                            <button
                              onClick={() => handleReprocess(statute.sourceId, statute.name)}
                              disabled={processing}
                              className="w-full px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                              🔄 Reprocess
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Configuration Panel */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">⚙️ Configuration</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

            {/* Jurisdiction */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jurisdiction
              </label>
              <select
                value={selectedJurisdiction}
                onChange={(e) => setSelectedJurisdiction(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 font-medium bg-white"
              >
                <option value="CA-ON" className="text-gray-900">Ontario (CA-ON)</option>
                <option value="CA-BC" className="text-gray-900">British Columbia (CA-BC)</option>
                <option value="CA-AB" className="text-gray-900">Alberta (CA-AB)</option>
                <option value="CA" className="text-gray-900">Canada Federal (CA)</option>
              </select>
            </div>

            {/* Legal Domain */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Legal Domain
              </label>
              <select
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 font-medium bg-white"
              >
                <option value="wrongful-termination" className="text-gray-900">Wrongful Termination</option>
                <option value="employment-discrimination" className="text-gray-900">Employment Discrimination</option>
                <option value="wage-hour-disputes" className="text-gray-900">Wage & Hour Disputes</option>
                <option value="workplace-harassment" className="text-gray-900">Workplace Harassment</option>
                <option value="landlord-tenant-residential" className="text-gray-900">Landlord-Tenant</option>
                <option value="eviction-defense" className="text-gray-900">Eviction Defense</option>
              </select>
            </div>

            {/* Statute to Scrape */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ontario Statute
              </label>
              <select
                value={selectedStatute}
                onChange={(e) => setSelectedStatute(e.target.value)}
                disabled={selectedJurisdiction !== 'CA-ON'}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 font-medium bg-white disabled:bg-gray-100"
              >
                <option value="00e41" className="text-gray-900">Employment Standards Act (00e41)</option>
                <option value="90h19" className="text-gray-900">Human Rights Code (90h19)</option>
                <option value="06r16" className="text-gray-900">Residential Tenancies Act (06r16)</option>
                <option value="90l07" className="text-gray-900">Labour Relations Act (90l07)</option>
              </select>
            </div>

            {/* AI Batch Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI Batch Size
              </label>
              <select
                value={batchSize}
                onChange={(e) => setBatchSize(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 font-medium bg-white"
              >
                <option value="1" className="text-gray-900">1 provision/batch (slower, higher quality)</option>
                <option value="2" className="text-gray-900">2 provisions/batch (balanced) ⭐</option>
                <option value="3" className="text-gray-900">3 provisions/batch (faster)</option>
                <option value="5" className="text-gray-900">5 provisions/batch (fastest, lower quality)</option>
              </select>
            </div>

            {/* Max Sections */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sections to Process
              </label>
              <select
                value={maxSections}
                onChange={(e) => setMaxSections(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 font-medium bg-white"
              >
                <option value="all" className="text-gray-900">All sections (full coverage)</option>
                <option value="10" className="text-gray-900">First 10 (quick test)</option>
                <option value="20" className="text-gray-900">First 20 (medium test)</option>
                <option value="50" className="text-gray-900">First 50 (partial coverage)</option>
                <option value="100" className="text-gray-900">First 100 (substantial coverage)</option>
              </select>
            </div>

            {/* Current Selection Summary */}
            <div className="lg:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Selection
              </label>
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-xs text-blue-900">
                  <strong>Will process:</strong><br />
                  {selectedJurisdiction} / {selectedDomain}<br />
                  Statute: {selectedStatute}<br />
                  Batch: {batchSize} / Limit: {maxSections}
                </p>
              </div>
            </div>

          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* Scraping Card */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">📚 Web Scraping</h2>
              <p className="mt-1 text-sm text-gray-500">
                Scrape legal statutes with your configuration
              </p>
            </div>
            <div className="px-6 py-5">
              <div className="space-y-4">
                <button
                  onClick={handleScrape}
                  disabled={scraping}
                  className={`w-full inline-flex justify-center items-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white ${
                    scraping
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                  }`}
                >
                  {scraping ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Scraping...
                    </>
                  ) : (
                    `Scrape ${selectedStatute === '00e41' ? 'ESA' : 'Selected Statute'}`
                  )}
                </button>

                {scrapingResult && (
                  <div className={`p-4 rounded-md border-2 ${
                    scrapingResult.startsWith('✅')
                      ? 'bg-green-50 border-green-200'
                      : scrapingResult.startsWith('🔄')
                      ? 'bg-blue-50 border-blue-200'
                      : scrapingResult.startsWith('ℹ️')
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <p className={`text-sm font-medium ${
                      scrapingResult.startsWith('✅')
                        ? 'text-green-900'
                        : scrapingResult.startsWith('ℹ️')
                        ? 'text-yellow-900'
                        : scrapingResult.startsWith('🔄')
                        ? 'text-blue-900'
                        : 'text-red-900'
                    }`}>{scrapingResult}</p>
                  </div>
                )}

                <div className="text-xs text-gray-500 space-y-1">
                  <p>• Jurisdiction: {selectedJurisdiction}</p>
                  <p>• Domain: {selectedDomain}</p>
                  <p>• Statute: {selectedStatute}</p>
                  <p>• Sections: {maxSections === 'all' ? 'All' : `First ${maxSections}`}</p>
                  <p>• Duration: ~5-10 minutes</p>
                </div>
              </div>
            </div>
          </div>

          {/* AI Processing Card */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">🤖 AI Processing</h2>
              <p className="mt-1 text-sm text-gray-500">
                Generate slots from scraped sources
              </p>
            </div>
            <div className="px-6 py-5">
              <div className="space-y-4">
                <button
                  onClick={handleProcessWithAI}
                  disabled={processing}
                  className={`w-full inline-flex justify-center items-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white ${
                    processing
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500'
                  }`}
                >
                  {processing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing with AI...
                    </>
                  ) : (
                    'Process with Claude AI'
                  )}
                </button>

                {processingResult && (
                  <div className={`p-4 rounded-md ${
                    processingResult.startsWith('✅')
                      ? 'bg-green-50 border-2 border-green-200'
                      : processingResult.startsWith('🔄')
                      ? 'bg-blue-50 border-2 border-blue-200'
                      : processingResult.startsWith('ℹ️')
                      ? 'bg-yellow-50 border-2 border-yellow-200'
                      : 'bg-red-50 border-2 border-red-200'
                  }`}>
                    <pre className={`text-sm font-mono whitespace-pre-wrap ${
                      processingResult.startsWith('✅')
                        ? 'text-green-900'
                        : processingResult.startsWith('ℹ️')
                        ? 'text-yellow-900'
                        : processingResult.startsWith('🔄')
                        ? 'text-blue-900'
                        : 'text-red-900'
                    }`}>{processingResult}</pre>
                  </div>
                )}

                <div className="text-xs text-gray-500 space-y-1">
                  <p>• Model: Claude Sonnet 4.5</p>
                  <p>• Batch size: {batchSize} provisions</p>
                  <p>• Domain: {selectedDomain}</p>
                  <p>• Duration: ~10-20 minutes</p>
                  <p>• Cost: ${batchSize === '1' ? '5-10' : batchSize === '2' ? '2-5' : '1-3'} in API credits</p>
                </div>
              </div>
            </div>
          </div>

          {/* Full Pipeline Card */}
          <div className="bg-white shadow rounded-lg overflow-hidden lg:col-span-2">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">⚡ Full Pipeline (Recommended)</h2>
              <p className="mt-1 text-sm text-gray-500">
                Run the complete workflow with your selected configuration
              </p>
            </div>
            <div className="px-6 py-5">
              <div className="space-y-4">
                <button
                  onClick={handleFullPipeline}
                  disabled={scraping || processing}
                  className={`w-full inline-flex justify-center items-center px-6 py-4 border border-transparent text-base font-medium rounded-md text-white ${
                    scraping || processing
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                  }`}
                >
                  {scraping || processing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Running Pipeline...
                    </>
                  ) : (
                    'Run Full Pipeline: Scrape → Process → Generate Slots'
                  )}
                </button>

                {(scrapingResult || processingResult) && (
                  <div className="space-y-2">
                    {scrapingResult && (
                      <div className={`p-3 rounded-md ${
                        scrapingResult.startsWith('✅')
                          ? 'bg-green-50 text-green-800'
                          : scrapingResult.startsWith('🔄')
                          ? 'bg-blue-50 text-blue-800'
                          : 'bg-red-50 text-red-800'
                      }`}>
                        <p className="text-sm"><strong>Scraping:</strong> {scrapingResult}</p>
                      </div>
                    )}
                    {processingResult && (
                      <div className={`p-3 rounded-md ${
                        processingResult.startsWith('✅')
                          ? 'bg-green-50 text-green-800'
                          : processingResult.startsWith('🔄')
                          ? 'bg-blue-50 text-blue-800'
                          : 'bg-red-50 text-red-800'
                      }`}>
                        <p className="text-sm"><strong>Processing:</strong> {processingResult}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-blue-900 mb-2">Your Pipeline Configuration:</h3>
                  <ol className="list-decimal list-inside text-xs text-blue-800 space-y-1">
                    <li>Scrape {selectedStatute === '00e41' ? 'Employment Standards Act' : 'selected statute'} from ontario.ca ({maxSections === 'all' ? 'all sections' : `first ${maxSections} sections`})</li>
                    <li>Save to jurisdiction: {selectedJurisdiction}, domain: {selectedDomain}</li>
                    <li>Process with Claude Sonnet 4.5 (batch size: {batchSize})</li>
                    <li>Generate comprehensive slot definitions</li>
                    <li>Save all slots for review</li>
                  </ol>
                  <div className="mt-3 text-xs text-blue-700">
                    <p><strong>Estimated Duration:</strong> {maxSections === 'all' ? '20-30' : maxSections === '10' ? '5-10' : '10-15'} minutes</p>
                    <p><strong>Expected Slots:</strong> {maxSections === 'all' ? '50-100' : Math.floor(parseInt(maxSections || '10') * 0.5)} slots</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Quick Links */}
        <div className="mt-8 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Links</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Link
              href="/admin/slots"
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              View Generated Slots
            </Link>
            <Link
              href="/admin/legal-sources"
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              View Legal Sources
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
