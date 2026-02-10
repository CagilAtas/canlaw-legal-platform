'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface SlotDefinition {
  id: string;
  slotKey: string;
  slotName: string;
  description: string;
  slotCategory: string;
  legalCitationText: string | null;
  versionNumber: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  config: {
    slotType: string;
    dataType: string;
    importance: string;
    legalBasis: {
      sourceId: string;
      provisionIds: string[];
      citationText: string;
      relevantExcerpt: string;
    };
    validation: any;
    ui: {
      component: string;
      label: string;
      helpText?: string;
      placeholder?: string;
      options?: Array<{ value: any; label: string }>;
    };
    calculation?: any;
    ai: {
      generatedAt: string;
      confidence: number;
      model: string;
      humanReviewed: boolean;
      reviewNotes?: string;
    };
  };
  jurisdiction?: {
    name: string;
    code: string;
  };
  legalDomain?: {
    name: string;
    slug: string;
  };
  legalSource?: {
    citation: string;
    longTitle: string;
  };
}

export default function SlotDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slotId = params.id as string;

  const [slot, setSlot] = useState<SlotDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedConfig, setEditedConfig] = useState<string>('');

  useEffect(() => {
    fetchSlot();
  }, [slotId]);

  const fetchSlot = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/slots/${slotId}`);
      const data = await response.json();
      setSlot(data);
      setEditedConfig(JSON.stringify(data.config, null, 2));
    } catch (error) {
      console.error('Failed to fetch slot:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveChanges = async () => {
    try {
      const config = JSON.parse(editedConfig);

      const response = await fetch('/api/admin/slots', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: slot?.id,
          updates: config
        })
      });

      if (response.ok) {
        setEditing(false);
        fetchSlot();
        alert('✅ Slot updated successfully!');
      } else {
        const data = await response.json();
        alert(`❌ Failed to save: ${data.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Failed to save changes:', error);
      if (error instanceof SyntaxError) {
        alert('❌ Invalid JSON syntax. Please fix the JSON and try again.');
      } else {
        alert(`❌ Failed to save changes: ${error.message}`);
      }
    }
  };

  const markAsReviewed = async () => {
    const notes = prompt('Review notes (optional):');

    try {
      const response = await fetch('/api/admin/slots', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: slot?.id,
          updates: {
            ai: {
              humanReviewed: true,
              reviewedAt: new Date().toISOString(),
              reviewNotes: notes || undefined
            }
          }
        })
      });

      if (response.ok) {
        alert('✅ Slot marked as reviewed!');
        fetchSlot();
      } else {
        const data = await response.json();
        alert(`❌ Failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to mark as reviewed:', error);
      alert('❌ Failed to mark as reviewed. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading slot details...</div>
      </div>
    );
  }

  if (!slot) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Slot not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Link href="/admin/slots" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
                ← Back to Slots
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">{slot.slotName}</h1>
              <p className="mt-1 text-sm font-mono text-gray-500">{slot.slotKey}</p>
            </div>
            <div className="flex gap-2">
              {!slot.config.ai.humanReviewed && (
                <button
                  onClick={markAsReviewed}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                >
                  ✓ Mark as Reviewed
                </button>
              )}
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Edit Config
                </button>
              ) : (
                <>
                  <button
                    onClick={saveChanges}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setEditedConfig(JSON.stringify(slot.config, null, 2));
                    }}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">

            {/* Overview */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Overview</h2>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {slot.config?.slotType && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Slot Type</dt>
                    <dd className="mt-1 text-sm text-gray-900">{slot.config.slotType}</dd>
                  </div>
                )}
                {slot.config?.dataType && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Data Type</dt>
                    <dd className="mt-1 text-sm text-gray-900">{slot.config.dataType}</dd>
                  </div>
                )}
                {slot.config?.importance && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Importance</dt>
                    <dd className="mt-1 text-sm text-gray-900">{slot.config.importance}</dd>
                  </div>
                )}
                {slot.config?.ui?.component && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">UI Component</dt>
                    <dd className="mt-1 text-sm text-gray-900">{slot.config.ui.component}</dd>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Description</dt>
                  <dd className="mt-1 text-sm text-gray-900">{slot.description || 'No description'}</dd>
                </div>
              </dl>
            </div>

            {/* Legal Basis */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Legal Basis</h2>
              <dl className="space-y-4">
                {slot.config?.legalBasis?.citationText && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Citation</dt>
                    <dd className="mt-1 text-sm text-gray-900">{slot.config.legalBasis.citationText}</dd>
                  </div>
                )}
                {slot.config?.legalBasis?.relevantExcerpt && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Relevant Excerpt</dt>
                    <dd className="mt-1 text-sm text-gray-900 italic bg-gray-50 p-3 rounded">
                      "{slot.config.legalBasis.relevantExcerpt}"
                    </dd>
                  </div>
                )}
                {slot.legalSource && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Legal Source</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {slot.legalSource.citation}
                      <br />
                      <span className="text-gray-600">{slot.legalSource.longTitle}</span>
                    </dd>
                  </div>
                )}
                {!slot.config?.legalBasis && (
                  <div className="text-sm text-gray-500 italic">No legal basis defined</div>
                )}
              </dl>
            </div>

            {/* UI Configuration */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">UI Configuration</h2>
              <div className="space-y-4">
                {slot.config?.ui?.label && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 mb-2">Question Label</dt>
                    <dd className="text-sm text-gray-900 bg-gray-50 p-3 rounded">
                      {slot.config.ui.label}
                    </dd>
                  </div>
                )}
                {slot.config?.ui?.helpText && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 mb-2">Help Text</dt>
                    <dd className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                      {slot.config.ui.helpText}
                    </dd>
                  </div>
                )}
                {slot.config?.ui?.options && slot.config.ui.options.length > 0 && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 mb-2">Options</dt>
                    <dd className="space-y-2">
                      {slot.config.ui.options.map((option, idx) => (
                        <div key={idx} className="bg-gray-50 p-3 rounded">
                          <span className="font-medium">{option.label}</span>
                          <span className="text-gray-500 ml-2 text-sm">({option.value})</span>
                        </div>
                      ))}
                    </dd>
                  </div>
                )}
                {!slot.config?.ui && (
                  <div className="text-sm text-gray-500 italic">No UI configuration</div>
                )}
              </div>
            </div>

            {/* Validation Rules */}
            {slot.config.validation && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Validation Rules</h2>
                <pre className="text-sm bg-gray-50 p-4 rounded overflow-x-auto">
                  {JSON.stringify(slot.config.validation, null, 2)}
                </pre>
              </div>
            )}

            {/* Calculation Config */}
            {slot.config.calculation && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Calculation Logic</h2>
                <pre className="text-sm bg-gray-50 p-4 rounded overflow-x-auto">
                  {JSON.stringify(slot.config.calculation, null, 2)}
                </pre>
              </div>
            )}

            {/* Full Config (Editable) */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Full Configuration (JSON)</h2>
              {editing ? (
                <div>
                  <textarea
                    value={editedConfig}
                    onChange={(e) => setEditedConfig(e.target.value)}
                    rows={30}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Edit the JSON configuration. Be careful to maintain valid JSON syntax.
                  </p>
                </div>
              ) : (
                <pre className="text-sm bg-gray-50 p-4 rounded overflow-x-auto">
                  {JSON.stringify(slot.config, null, 2)}
                </pre>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">

            {/* AI Metadata */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">AI Generation</h2>
              <dl className="space-y-3">
                {slot.config?.ai?.model && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Model</dt>
                    <dd className="mt-1 text-sm text-gray-900">{slot.config.ai.model}</dd>
                  </div>
                )}
                {slot.config?.ai?.confidence !== undefined && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Confidence</dt>
                    <dd className="mt-1">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900">
                          {(slot.config.ai.confidence * 100).toFixed(1)}%
                        </span>
                        <div className="ml-3 flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-indigo-600 h-2 rounded-full"
                            style={{ width: `${slot.config.ai.confidence * 100}%` }}
                          />
                        </div>
                      </div>
                    </dd>
                  </div>
                )}
                {slot.config?.ai?.generatedAt && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Generated At</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(slot.config.ai.generatedAt).toLocaleString()}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">Human Reviewed</dt>
                  <dd className="mt-1">
                    {slot.config?.ai?.humanReviewed ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✓ Reviewed
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Needs Review
                      </span>
                    )}
                  </dd>
                </div>
                {slot.config?.ai?.reviewNotes && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Review Notes</dt>
                    <dd className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {slot.config.ai.reviewNotes}
                    </dd>
                  </div>
                )}
                {!slot.config?.ai && (
                  <div className="text-sm text-gray-500 italic">No AI metadata</div>
                )}
              </dl>
            </div>

            {/* Metadata */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Metadata</h2>
              <dl className="space-y-3">
                {slot.jurisdiction && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Jurisdiction</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {slot.jurisdiction.name} ({slot.jurisdiction.code})
                    </dd>
                  </div>
                )}
                {slot.legalDomain && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Legal Domain</dt>
                    <dd className="mt-1 text-sm text-gray-900">{slot.legalDomain.name}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">Version</dt>
                  <dd className="mt-1 text-sm text-gray-900">v{slot.versionNumber}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1">
                    {slot.isActive ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Inactive
                      </span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(slot.createdAt).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(slot.updatedAt).toLocaleString()}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
