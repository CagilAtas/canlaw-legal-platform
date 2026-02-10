'use client';

import Link from 'next/link';

export default function AIProcessingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">AI Processing</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor Claude AI slot generation jobs
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <div className="text-gray-500 mb-4">AI processing monitor coming soon</div>
          <p className="text-sm text-gray-400">
            This will show active and completed AI slot generation jobs with token usage and confidence metrics
          </p>
        </div>
      </div>
    </div>
  );
}
