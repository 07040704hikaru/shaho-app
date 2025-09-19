import { NextResponse } from 'next/server';
import { z } from 'zod';

import { buildStandardRemunerationReport } from '@/lib/calculations/standardRemuneration';

const schema = z.object({
  employeeId: z.number().int().positive(),
  referenceDate: z.string().datetime(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const payload = schema.parse(json);

    const report = await buildStandardRemunerationReport({
      employeeId: payload.employeeId,
      referenceDate: new Date(payload.referenceDate),
    });

    return NextResponse.json({ ok: true, data: report });
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Validation error',
          issues: error.issues,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        message: 'Failed to evaluate standard remuneration',
      },
      { status: 500 },
    );
  }
}
