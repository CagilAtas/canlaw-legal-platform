'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface SlotDefinition {
  id: string;
  slotKey: string;
  slotName: string;
  description: string;
  slotCategory: string;
  config: {
    importance?: string;
    dataType?: string;
    ai?: {
      confidence?: number;
      humanReviewed?: boolean;
      generatedAt?: string;
    };
  };
  createdAt: string;
}

interface Stats {
  total: number;
  byImportance: {
    CRITICAL: number;
    HIGH: number;
    MODERATE: number;
    LOW: number;
  };
  byType: {
    input: number;
    calculated: number;
    outcome: number;
  };
  reviewed: number;
  avgConfidence: number;
}

export default function AdminSlotsPage() {
  const [slots, setSlots] = useState<SlotDefinition[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [importance, setImportance] = useState('');
  const [slotType, setSlotType] = useState('');
  const [reviewed, setReviewed] = useState('');
  const [minConfidence, setMinConfidence] = useState('');

  useEffect(() => {
    fetchSlots();
  }, [importance, slotType, reviewed, minConfidence]);

  const fetchSlots = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (importance) params.append('importance', importance);
      if (slotType) params.append('slotType', slotType);
      if (reviewed) params.append('reviewed', reviewed);
      if (minConfidence) params.append('minConfidence', minConfidence);

      const response = await fetch(`/api/admin/slots?${params.toString()}`);
      const data = await response.json();

      setSlots(data.slots || []);
      setStats(data.stats || null);
    } catch (error) {
      console.error('Failed to fetch slots:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsReviewed = async (slotId: string) => {
    try {
      const response = await fetch('/api/admin/slots', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId,
          updates: {
            ai: {
              humanReviewed: true,
              reviewedAt: new Date().toISOString()
            }
          }
        })
      });

      if (response.ok) {
        alert('Slot marked as reviewed successfully!');
        fetchSlots(); // Refresh list
      } else {
        const data = await response.json();
        alert(`Failed to mark as reviewed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to mark as reviewed:', error);
      alert('Failed to mark as reviewed. Please try again.');
    }
  };

  const getImportanceBadgeColor = (importance?: string) => {
    if (!importance) return 'bg-gray-100 text-gray-800';
    switch (importance) {
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'MODERATE': return 'bg-yellow-100 text-yellow-800';
      case 'LOW': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'input': return 'bg-blue-100 text-blue-800';
      case 'calculated': return 'bg-purple-100 text-purple-800';
      case 'outcome': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
                ← Back to Dashboard
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Slot Definitions</h1>
              <p className="mt-1 text-sm text-gray-500">
                Review and manage AI-generated slots
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-3xl font-bold text-indigo-600">{stats.total}</div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Slots</dt>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-3xl font-bold text-green-600">{stats.reviewed}</div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Reviewed</dt>
                      <dd className="text-sm text-gray-900">
                        {((stats.reviewed / stats.total) * 100).toFixed(0)}% complete
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-3xl font-bold text-blue-600">
                      {(stats.avgConfidence * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Avg Confidence</dt>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="text-sm font-medium text-gray-500 mb-2">By Importance</div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-red-600">CRITICAL:</span>
                    <span className="font-medium">{stats.byImportance.CRITICAL}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-orange-600">HIGH:</span>
                    <span className="font-medium">{stats.byImportance.HIGH}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-yellow-600">MODERATE:</span>
                    <span className="font-medium">{stats.byImportance.MODERATE}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">LOW:</span>
                    <span className="font-medium">{stats.byImportance.LOW}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Filters</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Importance
              </label>
              <select
                value={importance}
                onChange={(e) => setImportance(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">All</option>
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MODERATE">MODERATE</option>
                <option value="LOW">LOW</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Slot Type
              </label>
              <select
                value={slotType}
                onChange={(e) => setSlotType(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">All</option>
                <option value="input">Input</option>
                <option value="calculated">Calculated</option>
                <option value="outcome">Outcome</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Review Status
              </label>
              <select
                value={reviewed}
                onChange={(e) => setReviewed(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">All</option>
                <option value="true">Reviewed</option>
                <option value="false">Needs Review</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Confidence
              </label>
              <select
                value={minConfidence}
                onChange={(e) => setMinConfidence(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">All</option>
                <option value="0.95">95%+</option>
                <option value="0.90">90%+</option>
                <option value="0.80">80%+</option>
                <option value="0.70">70%+</option>
              </select>
            </div>
          </div>
        </div>

        {/* Slots List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {loading ? (
            <div className="text-center py-12">
              <div className="text-gray-500">Loading slots...</div>
            </div>
          ) : slots.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500">No slots found matching filters</div>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {slots.map((slot) => (
                <li key={slot.id}>
                  <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-medium text-gray-900 truncate">
                            {slot.slotName}
                          </h3>
                          {slot.config?.importance && (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getImportanceBadgeColor(slot.config.importance)}`}>
                              {slot.config.importance}
                            </span>
                          )}
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeColor(slot.slotCategory)}`}>
                            {slot.slotCategory}
                          </span>
                          {slot.config?.ai?.humanReviewed && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              ✓ Reviewed
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 font-mono mb-2">{slot.slotKey}</p>
                        <p className="text-sm text-gray-700">{slot.description || 'No description'}</p>
                        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                          {slot.config?.dataType && <span>Type: {slot.config.dataType}</span>}
                          {slot.config?.ai?.confidence !== undefined && (
                            <span>Confidence: {(slot.config.ai.confidence * 100).toFixed(1)}%</span>
                          )}
                          {slot.config?.ai?.generatedAt && (
                            <span>Generated: {new Date(slot.config.ai.generatedAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="ml-5 flex-shrink-0 flex items-center gap-2">
                        {!slot.config?.ai?.humanReviewed && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              markAsReviewed(slot.id);
                            }}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            Mark Reviewed
                          </button>
                        )}
                        <Link
                          href={`/admin/slots/${slot.id}`}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
