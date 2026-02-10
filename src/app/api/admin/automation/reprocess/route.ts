// API route to reprocess an already-processed legal source
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { BatchSlotGenerator } from '@/features/legal-knowledge/processors/batch-slot-generator';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sourceId, domainSlug = 'wrongful-termination', batchSize = 2, deleteExisting = true } = body;

    if (!sourceId) {
      return NextResponse.json(
        { error: 'sourceId is required' },
        { status: 400 }
      );
    }

    console.log('🔄 Starting reprocessing...', {
      sourceId,
      domainSlug,
      batchSize,
      deleteExisting
    });

    // Get the source
    const source = await prisma.legalSource.findUnique({
      where: { id: sourceId },
      include: {
        jurisdiction: true,
        legalDomain: true
      }
    });

    if (!source) {
      return NextResponse.json(
        { error: 'Legal source not found' },
        { status: 404 }
      );
    }

    // Optional: Delete existing slots before reprocessing
    if (deleteExisting) {
      const deletedSlots = await prisma.slotDefinition.deleteMany({
        where: {
          legalSourceId: sourceId
        }
      });

      console.log(`🗑️ Deleted ${deletedSlots.count} existing slots`);
    }

    // Mark as unprocessed
    await prisma.legalSource.update({
      where: { id: sourceId },
      data: {
        aiProcessed: false,
        aiProcessedAt: null
      }
    });

    // Process with AI
    const generator = new BatchSlotGenerator();
    const result = await generator.processLegalSource(sourceId, {
      legalDomainSlug: domainSlug,
      batchSize: parseInt(String(batchSize), 10)
    });

    // Mark source as processed
    await prisma.legalSource.update({
      where: { id: sourceId },
      data: {
        aiProcessed: true,
        aiProcessedAt: new Date()
      }
    });

    console.log(`✅ Reprocessed and generated ${result.totalSlots} slots`);

    return NextResponse.json({
      success: true,
      citation: source.citation,
      totalSlots: result.totalSlots,
      batches: result.batches,
      averageConfidence: result.averageConfidence,
      slotsPerBatch: result.slotsPerBatch,
      deletedExistingSlots: deleteExisting
    });

  } catch (error: any) {
    console.error('❌ Reprocessing error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
