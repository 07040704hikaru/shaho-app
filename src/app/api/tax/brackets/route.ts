import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { IncomeTaxTableType } from '@prisma/client';

const querySchema = z.object({
  tableType: z.nativeEnum(IncomeTaxTableType),
  dependents: z.coerce.number().int().min(0).default(0),
  taxableIncome: z.coerce.number().optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.parse({
      tableType: searchParams.get('tableType') ?? undefined,
      dependents: searchParams.get('dependents') ?? undefined,
      taxableIncome: searchParams.get('taxableIncome') ?? undefined,
    });

    const brackets = await prisma.incomeTaxBracket.findMany({
      where: {
        tableType: parsed.tableType,
        dependents: parsed.dependents,
      },
      orderBy: [{ lowerBound: 'asc' }],
    });

    const taxableIncome = parsed.taxableIncome;

    const enriched = brackets.map((bracket) => {
      const min = bracket.lowerBound;
      const max = bracket.upperBound ?? null;
      const baseTax = Number(bracket.taxAmount);
      const deduction = Number(bracket.deduction ?? 0);
      let applied = null as number | null;

      if (taxableIncome != null) {
        const withinLower = taxableIncome >= bracket.lowerBound;
        const withinUpper = bracket.upperBound == null || taxableIncome <= bracket.upperBound;
        if (withinLower && withinUpper) {
          applied = Math.max(0, baseTax - deduction);
        }
      }

      return {
        id: bracket.id,
        range: { min, max },
        baseTax,
        deduction,
        effectiveTax: Math.max(0, baseTax - deduction),
        appliesToInput: applied != null,
        inputTax: applied,
      };
    });

    return NextResponse.json({ ok: true, data: enriched });
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Invalid query parameters',
          issues: error.issues,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: false, message: 'Failed to fetch tax brackets' }, { status: 500 });
  }
}
