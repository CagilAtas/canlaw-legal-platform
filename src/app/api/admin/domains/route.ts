import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const domains = await prisma.legalDomain.findMany({
      include: {
        _count: {
          select: { legalSources: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    const stats = {
      total: domains.length,
      withSources: domains.filter(d => d._count.legalSources > 0).length,
      totalSources: domains.reduce((sum, d) => sum + d._count.legalSources, 0)
    };

    return NextResponse.json({
      success: true,
      domains,
      stats
    });
  } catch (error: any) {
    console.error('Failed to fetch domains:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
