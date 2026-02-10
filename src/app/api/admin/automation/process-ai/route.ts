// API route to process legal sources with AI
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { BatchSlotGenerator } from '@/features/legal-knowledge/processors/batch-slot-generator';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { sourceId } = body;

    console.log('🤖 Starting AI processing...');

    let legalSourceId = sourceId;

    // If no source ID provided, find the most recent unprocessed source
    if (!legalSourceId) {
      const source = await prisma.legalSource.findFirst({
        where: {
          aiProcessed: false
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (!source) {
        return NextResponse.json(
          { error: 'No unprocessed legal sources found' },
          { status: 400 }
        );
      }

      legalSourceId = source.id;
    }

    // Process with AI
    const generator = new BatchSlotGenerator();
    const result = await generator.processLegalSource(legalSourceId, {
      legalDomainSlug: 'wrongful-termination',
      batchSize: 2
    });

    // Mark source as processed
    await prisma.legalSource.update({
      where: { id: legalSourceId },
      data: {
        aiProcessed: true,
        aiProcessedAt: new Date()
      }
    });

    console.log(`✅ Generated ${result.totalSlots} slots`);

    return NextResponse.json({
      success: true,
      totalSlots: result.totalSlots,
      batches: result.batches,
      averageConfidence: result.averageConfidence,
      slotsPerBatch: result.slotsPerBatch
    });

  } catch (error: any) {
    console.error('❌ AI processing error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
