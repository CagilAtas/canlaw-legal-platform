'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function AutomationControlPage() {
  const [scraping, setScraping] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [scrapingResult, setScrapingResult] = useState<string | null>(null);
  const [processingResult, setProcessingResult] = useState<string | null>(null);

  const handleScrapeESA = async () => {
    if (!confirm('This will scrape the full Ontario Employment Standards Act (761 sections). This may take 5-10 minutes. Continue?')) {
      return;
    }

    setScraping(true);
    setScrapingResult(null);

    try {
      const response = await fetch('/api/admin/automation/scrape-esa', {
        method: 'POST'
      });

      const data = await response.json();

      if (response.ok) {
        setScrapingResult(`✅ Successfully scraped ${data.sections} sections from ${data.citation}`);
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
    if (!confirm('This will process all unprocessed legal sources with Claude AI to generate slots. This may take 10-20 minutes and will use AI credits. Continue?')) {
      return;
    }

    setProcessing(true);
    setProcessingResult(null);

    try {
      const response = await fetch('/api/admin/automation/process-ai', {
        method: 'POST'
      });

      const data = await response.json();

      if (response.ok) {
        setProcessingResult(`✅ Successfully generated ${data.totalSlots} slots from ${data.batches} batches. Average confidence: ${(data.averageConfidence * 100).toFixed(1)}%`);
      } else {
        setProcessingResult(`❌ Error: ${data.error}`);
      }
    } catch (error: any) {
      setProcessingResult(`❌ Error: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleFullPipeline = async () => {
    if (!confirm('This will run the FULL pipeline: scrape ESA → process with AI → generate slots. This may take 20-30 minutes and will use significant AI credits. Continue?')) {
      return;
    }

    // Run scraping first
    setScraping(true);
    setScrapingResult('🔄 Scraping ESA...');

    try {
      const scrapeResponse = await fetch('/api/admin/automation/scrape-esa', {
        method: 'POST'
      });

      const scrapeData = await scrapeResponse.json();

      if (!scrapeResponse.ok) {
        setScrapingResult(`❌ Scraping failed: ${scrapeData.error}`);
        setScraping(false);
        return;
      }

      setScrapingResult(`✅ Scraped ${scrapeData.sections} sections`);
      setScraping(false);

      // Then run AI processing
      setProcessing(true);
      setProcessingResult('🔄 Processing with AI...');

      const processResponse = await fetch('/api/admin/automation/process-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: scrapeData.sourceId })
      });

      const processData = await processResponse.json();

      if (!processResponse.ok) {
        setProcessingResult(`❌ Processing failed: ${processData.error}`);
        setProcessing(false);
        return;
      }

      setProcessingResult(`✅ Generated ${processData.totalSlots} slots with ${(processData.averageConfidence * 100).toFixed(1)}% avg confidence`);
      setProcessing(false);

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
            Run automated scraping and AI processing tasks
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* Scraping Card */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">📚 Web Scraping</h2>
              <p className="mt-1 text-sm text-gray-500">
                Scrape legal statutes from ontario.ca
              </p>
            </div>
            <div className="px-6 py-5">
              <div className="space-y-4">
                <button
                  onClick={handleScrapeESA}
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
                      Scraping ESA...
                    </>
                  ) : (
                    'Scrape Ontario ESA (761 sections)'
                  )}
                </button>

                {scrapingResult && (
                  <div className={`p-4 rounded-md ${
                    scrapingResult.startsWith('✅')
                      ? 'bg-green-50 text-green-800'
                      : scrapingResult.startsWith('🔄')
                      ? 'bg-blue-50 text-blue-800'
                      : 'bg-red-50 text-red-800'
                  }`}>
                    <p className="text-sm font-medium">{scrapingResult}</p>
                  </div>
                )}

                <div className="text-xs text-gray-500 space-y-1">
                  <p>• Fetches from ontario.ca/laws</p>
                  <p>• Extracts all sections and provisions</p>
                  <p>• Saves to database for AI processing</p>
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
                Generate slots from legal sources using Claude AI
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
                      ? 'bg-green-50 text-green-800'
                      : processingResult.startsWith('🔄')
                      ? 'bg-blue-50 text-blue-800'
                      : 'bg-red-50 text-red-800'
                  }`}>
                    <p className="text-sm font-medium">{processingResult}</p>
                  </div>
                )}

                <div className="text-xs text-gray-500 space-y-1">
                  <p>• Uses Claude Sonnet 4.5</p>
                  <p>• Processes 2 provisions per batch</p>
                  <p>• Generates input, calculated, outcome slots</p>
                  <p>• Duration: ~10-20 minutes</p>
                  <p>• Cost: ~$2-5 in API credits</p>
                </div>
              </div>
            </div>
          </div>

          {/* Full Pipeline Card */}
          <div className="bg-white shadow rounded-lg overflow-hidden lg:col-span-2">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">⚡ Full Pipeline (Recommended)</h2>
              <p className="mt-1 text-sm text-gray-500">
                Run the complete workflow: scrape → process → generate slots
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
                    'Run Full Pipeline: Scrape ESA → Process with AI → Generate Slots'
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
                  <h3 className="text-sm font-medium text-blue-900 mb-2">Pipeline Steps:</h3>
                  <ol className="list-decimal list-inside text-xs text-blue-800 space-y-1">
                    <li>Scrape Employment Standards Act from ontario.ca (761 sections)</li>
                    <li>Save all provisions to database</li>
                    <li>Process with Claude AI in batches of 2 provisions</li>
                    <li>Generate comprehensive slot definitions</li>
                    <li>Save slots to database for review</li>
                  </ol>
                  <div className="mt-3 text-xs text-blue-700">
                    <p><strong>Total Duration:</strong> 20-30 minutes</p>
                    <p><strong>Expected Output:</strong> 50-100 slot definitions</p>
                    <p><strong>API Cost:</strong> $2-5 in Claude credits</p>
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
