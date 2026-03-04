import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const clientUpdateSchema = z.object({
  name: z.string().trim().min(1),
  contactEmail: z.string().trim().email().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

function normalizeOptional(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const form = await request.formData();
  const payload = {
    name: String(form.get("name") ?? ""),
    contactEmail: String(form.get("contactEmail") ?? ""),
    notes: String(form.get("notes") ?? ""),
  };

  const parsed = clientUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.redirect(new URL(`/clients/${id}?error=1`, request.url));
  }

  await prisma.client.update({
    where: { id },
    data: {
      name: parsed.data.name,
      contactEmail: normalizeOptional(parsed.data.contactEmail),
      notes: normalizeOptional(parsed.data.notes),
    },
  });

  return NextResponse.redirect(new URL(`/clients/${id}?saved=1`, request.url));
}
