// API route to fetch legal sources
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const sources = await prisma.legalSource.findMany({
      include: {
        jurisdiction: {
          select: { name: true, code: true }
        },
        legalDomain: {
          select: { name: true }
        },
        _count: {
          select: { provisions: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ sources });

  } catch (error: any) {
    console.error('Error fetching legal sources:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
