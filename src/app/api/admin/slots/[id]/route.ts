// API route to fetch a single slot by ID
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const slot = await prisma.slotDefinition.findUnique({
      where: { id: params.id },
      include: {
        jurisdiction: true,
        legalDomain: true,
        legalSource: true
      }
    });

    if (!slot) {
      return NextResponse.json(
        { error: 'Slot not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(slot);

  } catch (error: any) {
    console.error('Error fetching slot:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
