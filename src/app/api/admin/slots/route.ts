// API route to fetch slots with filters
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const importance = searchParams.get('importance');
    const slotType = searchParams.get('slotType');
    const reviewed = searchParams.get('reviewed');
    const minConfidence = searchParams.get('minConfidence');

    // Build where clause
    const where: any = {
      isActive: true
    };

    if (slotType) {
      where.slotCategory = slotType;
    }

    // Fetch slots
    const slots = await prisma.slotDefinition.findMany({
      where,
      include: {
        jurisdiction: true,
        legalDomain: true,
        legalSource: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Filter by config fields (stored in JSON)
    let filteredSlots = slots;

    if (importance) {
      filteredSlots = filteredSlots.filter(slot => {
        const config = slot.config as any;
        return config?.importance === importance;
      });
    }

    if (reviewed !== null && reviewed !== undefined) {
      const isReviewed = reviewed === 'true';
      filteredSlots = filteredSlots.filter(slot => {
        const config = slot.config as any;
        return config?.ai?.humanReviewed === isReviewed;
      });
    }

    if (minConfidence) {
      const threshold = parseFloat(minConfidence);
      filteredSlots = filteredSlots.filter(slot => {
        const config = slot.config as any;
        return (config?.ai?.confidence || 0) >= threshold;
      });
    }

    // Calculate stats
    const stats = {
      total: filteredSlots.length,
      byImportance: {
        CRITICAL: filteredSlots.filter(s => (s.config as any)?.importance === 'CRITICAL').length,
        HIGH: filteredSlots.filter(s => (s.config as any)?.importance === 'HIGH').length,
        MODERATE: filteredSlots.filter(s => (s.config as any)?.importance === 'MODERATE').length,
        LOW: filteredSlots.filter(s => (s.config as any)?.importance === 'LOW').length,
      },
      byType: {
        input: filteredSlots.filter(s => s.slotCategory === 'input').length,
        calculated: filteredSlots.filter(s => s.slotCategory === 'calculated').length,
        outcome: filteredSlots.filter(s => s.slotCategory === 'outcome').length,
      },
      reviewed: filteredSlots.filter(s => (s.config as any)?.ai?.humanReviewed === true).length,
      avgConfidence: filteredSlots.length > 0
        ? filteredSlots.reduce((sum, s) => sum + ((s.config as any)?.ai?.confidence || 0), 0) / filteredSlots.length
        : 0
    };

    return NextResponse.json({
      slots: filteredSlots,
      stats
    });

  } catch (error: any) {
    console.error('Error fetching slots:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// Update slot (mark as reviewed, edit config, etc.)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { slotId, updates } = body;

    const slot = await prisma.slotDefinition.findUnique({
      where: { id: slotId }
    });

    if (!slot) {
      return NextResponse.json(
        { error: 'Slot not found' },
        { status: 404 }
      );
    }

    const config = slot.config as any;

    // Apply updates to config - deep merge
    const updatedConfig = {
      ...config,
      ...updates,
      ai: {
        ...(config?.ai || {}),
        ...(updates?.ai || {})
      }
    };

    // Update in database
    const updated = await prisma.slotDefinition.update({
      where: { id: slotId },
      data: {
        config: updatedConfig,
        slotName: updates.slotName || slot.slotName,
        description: updates.description || slot.description,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ success: true, slot: updated });

  } catch (error: any) {
    console.error('Error updating slot:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
