// API Route: Get current progress of an interview

import { NextResponse } from 'next/server';
import { interviewEngine } from '@/features/interview/interview-engine';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId');

    if (!caseId) {
      return NextResponse.json(
        { success: false, error: 'Missing caseId parameter' },
        { status: 400 }
      );
    }

    const progress = await interviewEngine.getCaseProgress(caseId);

    return NextResponse.json({
      success: true,
      progress
    });
  } catch (error: any) {
    console.error('Error getting progress:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
