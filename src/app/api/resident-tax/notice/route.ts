import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';

const querySchema = z.object({
  employeeId: z.coerce.number().int().positive(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const params = querySchema.parse({ employeeId: searchParams.get('employeeId') });

    const notice = await prisma.residentTaxNotice.findMany({
      where: { employeeId: params.employeeId },
      include: {
        allocations: {
          orderBy: [{ year: 'asc' }, { month: 'asc' }],
        },
      },
      orderBy: [{ fiscalYear: 'desc' }],
    });

    return NextResponse.json({ ok: true, data: notice });
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Invalid query parameter',
          issues: error.issues,
        },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: false, message: 'Failed to load resident tax' }, { status: 500 });
  }
}
