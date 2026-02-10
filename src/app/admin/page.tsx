// Admin Dashboard Home
import Link from 'next/link';

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          CanLaw Admin Dashboard
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Slots Management */}
          <Link href="/admin/slots">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition cursor-pointer border-l-4 border-blue-500">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Slot Definitions
              </h2>
              <p className="text-gray-600">
                Review and manage AI-generated interview questions and calculations
              </p>
              <div className="mt-4 text-blue-600 font-medium">
                View Slots →
              </div>
            </div>
          </Link>

          {/* Legal Sources */}
          <Link href="/admin/legal-sources">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition cursor-pointer border-l-4 border-green-500">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Legal Sources
              </h2>
              <p className="text-gray-600">
                Browse scraped statutes, regulations, and case law
              </p>
              <div className="mt-4 text-green-600 font-medium">
                View Sources →
              </div>
            </div>
          </Link>

          {/* Scraping Jobs */}
          <Link href="/admin/scraping">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition cursor-pointer border-l-4 border-purple-500">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Scraping Jobs
              </h2>
              <p className="text-gray-600">
                Monitor automated scraping and AI processing jobs
              </p>
              <div className="mt-4 text-purple-600 font-medium">
                View Jobs →
              </div>
            </div>
          </Link>

          {/* AI Processing */}
          <Link href="/admin/ai-processing">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition cursor-pointer border-l-4 border-yellow-500">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                AI Processing
              </h2>
              <p className="text-gray-600">
                View AI slot generation jobs and confidence scores
              </p>
              <div className="mt-4 text-yellow-600 font-medium">
                View Processing →
              </div>
            </div>
          </Link>

          {/* Change Detection */}
          <Link href="/admin/changes">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition cursor-pointer border-l-4 border-red-500">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Law Changes
              </h2>
              <p className="text-gray-600">
                Review detected changes in legal sources
              </p>
              <div className="mt-4 text-red-600 font-medium">
                View Changes →
              </div>
            </div>
          </Link>

          {/* Settings */}
          <Link href="/admin/settings">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition cursor-pointer border-l-4 border-gray-500">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Settings
              </h2>
              <p className="text-gray-600">
                Configure jurisdictions, domains, and system settings
              </p>
              <div className="mt-4 text-gray-600 font-medium">
                View Settings →
              </div>
            </div>
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Quick Stats
          </h2>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <div className="text-3xl font-bold text-blue-600">57</div>
                <div className="text-sm text-gray-600">Generated Slots</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-600">761</div>
                <div className="text-sm text-gray-600">Scraped Sections</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-purple-600">91.3%</div>
                <div className="text-sm text-gray-600">Avg Confidence</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-yellow-600">1</div>
                <div className="text-sm text-gray-600">Active Statutes</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
