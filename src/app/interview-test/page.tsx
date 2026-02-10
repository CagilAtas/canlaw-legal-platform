'use client';

import { useState } from 'react';

export default function InterviewTestPage() {
  const [caseId, setCaseId] = useState<string>('');
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [answer, setAnswer] = useState<string>('');
  const [progress, setProgress] = useState<any>(null);
  const [log, setLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (message: string) => {
    setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const startInterview = async () => {
    setLoading(true);
    addLog('Starting new interview...');

    try {
      const response = await fetch('/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'test-user' })
      });

      const data = await response.json();

      if (data.success) {
        setCaseId(data.caseId);
        setCurrentQuestion(data.nextQuestion);
        addLog(`✅ Interview started. Case ID: ${data.caseId}`);
        addLog(`First question: ${data.nextQuestion?.slotName || 'None'}`);
      } else {
        addLog(`❌ Error: ${data.error}`);
      }
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!caseId || !currentQuestion || !answer) {
      addLog('❌ Please provide all required fields');
      return;
    }

    setLoading(true);
    addLog(`Submitting answer for ${currentQuestion.slotKey}: ${answer}`);

    try {
      const response = await fetch('/api/interview/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId,
          slotKey: currentQuestion.slotKey,
          value: answer
        })
      });

      const data = await response.json();

      if (data.success) {
        setProgress(data.progress);
        setCurrentQuestion(data.nextQuestion);
        setAnswer('');

        if (data.isComplete) {
          addLog('✅ Interview complete!');
        } else {
          addLog(`✅ Answer submitted. Next question: ${data.nextQuestion?.slotName || 'None'}`);
          addLog(`Progress: ${data.progress.answeredCount}/${data.progress.totalCount} (${data.progress.percentComplete}%)`);
        }
      } else {
        addLog(`❌ Error: ${data.error}`);
      }
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Interview Engine Test</h1>

        {/* Start Interview */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">1. Start Interview</h2>
          <button
            onClick={startInterview}
            disabled={loading || !!caseId}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Starting...' : 'Start New Interview'}
          </button>

          {caseId && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
              <p className="text-sm text-green-800">
                <strong>Case ID:</strong> {caseId}
              </p>
            </div>
          )}
        </div>

        {/* Current Question */}
        {currentQuestion && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">2. Answer Question</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {currentQuestion.slotName}
              </label>
              <p className="text-sm text-gray-600 mb-3">{currentQuestion.description}</p>

              <div className="space-y-2">
                <p className="text-xs text-gray-500">
                  <strong>Slot Key:</strong> {currentQuestion.slotKey}
                </p>
                <p className="text-xs text-gray-500">
                  <strong>Importance:</strong>{' '}
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      currentQuestion.importance === 'CRITICAL'
                        ? 'bg-red-100 text-red-800'
                        : currentQuestion.importance === 'HIGH'
                        ? 'bg-orange-100 text-orange-800'
                        : currentQuestion.importance === 'MODERATE'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {currentQuestion.importance}
                  </span>
                </p>
              </div>

              <input
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Enter your answer..."
                className="mt-3 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') submitAnswer();
                }}
              />
            </div>

            <button
              onClick={submitAnswer}
              disabled={loading || !answer}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Submit Answer'}
            </button>
          </div>
        )}

        {/* Progress */}
        {progress && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">3. Progress</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Questions Answered:</span>
                <span className="font-medium">
                  {progress.answeredCount} / {progress.totalCount}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.percentComplete}%` }}
                />
              </div>
              <div className="text-right text-sm text-gray-600">
                {progress.percentComplete}% Complete
              </div>
            </div>
          </div>
        )}

        {/* Event Log */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Event Log</h2>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm h-64 overflow-y-auto">
            {log.length === 0 ? (
              <p className="text-gray-500">No events yet...</p>
            ) : (
              log.map((entry, index) => (
                <div key={index} className="mb-1">
                  {entry}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
