import { NextResponse } from 'next/server';
import { z } from 'zod';

import { importResidentTaxNotices } from '@/lib/services/residentTax';

const schema = z.object({
  csv: z.string().min(1),
  commit: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const payload = schema.parse(json);

    const results = await importResidentTaxNotices({
      csvText: payload.csv,
      commit: payload.commit ?? false,
    });

    return NextResponse.json({ ok: true, data: results });
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
    return NextResponse.json({ ok: false, message: 'Import failed' }, { status: 500 });
  }
}
