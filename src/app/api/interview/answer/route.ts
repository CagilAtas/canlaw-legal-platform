// API Route: Submit an answer and get next question

import { NextResponse } from 'next/server';
import { interviewEngine } from '@/features/interview/interview-engine';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { caseId, slotKey, value } = body;

    if (!caseId || !slotKey) {
      return NextResponse.json(
        { success: false, error: 'Missing caseId or slotKey' },
        { status: 400 }
      );
    }

    // Update case with answer
    await interviewEngine.updateCaseSlotValues(caseId, {
      [slotKey]: value
    });

    // Get next question
    const nextQuestions = await interviewEngine.getNextQuestions(caseId, {
      maxQuestions: 1,
      priorityThreshold: 'LOW'
    });

    // Get progress
    const progress = await interviewEngine.getCaseProgress(caseId);

    return NextResponse.json({
      success: true,
      nextQuestion: nextQuestions[0] || null,
      progress,
      isComplete: nextQuestions.length === 0
    });
  } catch (error: any) {
    console.error('Error submitting answer:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
