import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const clientCreateSchema = z.object({
  name: z.string().trim().min(1),
  contactEmail: z.string().trim().email().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

function normalizeOptional(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function GET() {
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ clients });
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  let payload: { name: string; contactEmail?: string; notes?: string };

  if (contentType.includes("application/json")) {
    payload = (await request.json()) as typeof payload;
  } else {
    const form = await request.formData();
    payload = {
      name: String(form.get("name") ?? ""),
      contactEmail: String(form.get("contactEmail") ?? ""),
      notes: String(form.get("notes") ?? ""),
    };
  }

  const parsed = clientCreateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid client payload." }, { status: 400 });
  }

  const created = await prisma.client.create({
    data: {
      name: parsed.data.name,
      contactEmail: normalizeOptional(parsed.data.contactEmail),
      notes: normalizeOptional(parsed.data.notes),
    },
  });

  if (contentType.includes("application/json")) {
    return NextResponse.json({ client: created }, { status: 201 });
  }

  return NextResponse.redirect(new URL(`/clients/${created.id}`, request.url));
}
