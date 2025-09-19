import { NextResponse } from 'next/server';
import { z } from 'zod';

import { calculatePayroll } from '@/lib/calculations/payroll';

const requestSchema = z.object({
  employeeId: z.number().int().positive(),
  payrollDate: z.string().datetime({ offset: true }),
  periodStart: z.string().datetime({ offset: true }),
  periodEnd: z.string().datetime({ offset: true }),
  baseSalary: z.number().min(0),
  overtimeHours: z.number().min(0).optional(),
  overtimeRate: z.number().min(0).optional(),
  allowances: z
    .array(
      z.object({
        itemCode: z.string(),
        amount: z.number(),
      }),
    )
    .optional(),
  deductions: z
    .array(
      z.object({
        itemCode: z.string(),
        amount: z.number(),
      }),
    )
    .optional(),
  bonusAmount: z.number().min(0).optional(),
  includeResidentTax: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const payload = requestSchema.parse(json);

    const result = await calculatePayroll(payload);

    return NextResponse.json({
      ok: true,
      data: result,
    });
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        ok: false,
        message: 'Validation error',
        issues: error.issues,
      }, { status: 400 });
    }

    return NextResponse.json({
      ok: false,
      message: 'Unexpected error',
    }, { status: 500 });
  }
}
