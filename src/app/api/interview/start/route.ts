// API Route: Start a new interview (create case and get first question)

import { NextResponse } from 'next/server';
import { interviewEngine } from '@/features/interview/interview-engine';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body;

    // Create new case
    const caseId = await interviewEngine.createCase(userId);

    // Get first question (should be jurisdiction selector)
    const nextQuestions = await interviewEngine.getNextQuestions(caseId, {
      maxQuestions: 1,
      priorityThreshold: 'LOW'
    });

    return NextResponse.json({
      success: true,
      caseId,
      nextQuestion: nextQuestions[0] || null,
      message: 'Interview started'
    });
  } catch (error: any) {
    console.error('Error starting interview:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
