// API route to process legal sources with AI
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { BatchSlotGenerator } from '@/features/legal-knowledge/processors/batch-slot-generator';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { sourceId, domainSlug = 'wrongful-termination', batchSize = 2 } = body;

    console.log('🤖 Starting AI processing...', {
      sourceId: sourceId || 'auto-detect',
      domainSlug,
      batchSize
    });

    let legalSourceId = sourceId;
    let sourceDetails;

    // If no source ID provided, find the most recent unprocessed source
    if (!legalSourceId) {
      const source = await prisma.legalSource.findFirst({
        where: {
          aiProcessed: false
        },
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          jurisdiction: true,
          legalDomain: true,
          _count: {
            select: { provisions: true }
          }
        }
      });

      if (!source) {
        return NextResponse.json(
          { error: 'No unprocessed legal sources found. All sources have been processed!' },
          { status: 400 }
        );
      }

      legalSourceId = source.id;
      sourceDetails = source;
    } else {
      // Get source details if ID was provided
      sourceDetails = await prisma.legalSource.findUnique({
        where: { id: legalSourceId },
        include: {
          jurisdiction: true,
          legalDomain: true,
          _count: {
            select: { provisions: true }
          }
        }
      });

      if (!sourceDetails) {
        return NextResponse.json(
          { error: 'Legal source not found' },
          { status: 404 }
        );
      }

      // Check if already processed
      if (sourceDetails.aiProcessed) {
        return NextResponse.json(
          {
            error: 'This source has already been processed',
            alreadyProcessed: true,
            citation: sourceDetails.citation,
            processedAt: sourceDetails.aiProcessedAt,
            message: 'Use the "Reprocess" button if you want to regenerate slots for this source'
          },
          { status: 400 }
        );
      }
    }

    console.log(`📚 Processing: ${sourceDetails.citation}`);
    console.log(`📍 Jurisdiction: ${sourceDetails.jurisdiction.name}`);
    console.log(`⚖️ Domain: ${sourceDetails.legalDomain?.name || 'N/A'}`);
    console.log(`📄 Provisions: ${sourceDetails._count.provisions}`);

    // Process with AI
    const generator = new BatchSlotGenerator();
    const result = await generator.processLegalSource(legalSourceId, {
      legalDomainSlug: domainSlug,
      batchSize: parseInt(String(batchSize), 10)
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
      citation: sourceDetails.citation,
      jurisdiction: sourceDetails.jurisdiction.name,
      domain: sourceDetails.legalDomain?.name,
      provisions: sourceDetails._count.provisions,
      totalSlots: result.totalSlots,
      batches: result.batches,
      averageConfidence: result.averageConfidence,
      slotsPerBatch: result.slotsPerBatch,
      processedAt: new Date()
    });

  } catch (error: any) {
    console.error('❌ AI processing error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
