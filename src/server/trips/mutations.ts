import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { TripListItem } from "@/server/trips/queries";

export type TripDraft = {
  title: string;
  slug?: string;
  tripDates: string;
  baseLocation: string;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function ensureUniqueSlug(base: string): Promise<string> {
  let candidate = base;
  let counter = 0;

  while (await prisma.trip.findUnique({ where: { slug: candidate } })) {
    counter += 1;
    candidate = `${base}-${counter}`;
  }

  return candidate;
}

export async function createTrip(userId: string, draft: TripDraft): Promise<TripListItem> {
  if (!draft.title.trim()) {
    throw new Error("タイトルは必須です。");
  }

  const providedSlug = draft.slug?.trim();
  const baseSlugCandidate = providedSlug ? slugify(providedSlug) : slugify(draft.title);
  const baseSlug = baseSlugCandidate || slugify(`${draft.title}-${Date.now()}`);
  const finalSlug = await ensureUniqueSlug(baseSlug);

  const data: Prisma.TripCreateInput = {
    title: draft.title.trim(),
    slug: finalSlug,
    subtitle: "",
    dedication: "",
    tripDates: draft.tripDates.trim(),
    baseLocation: draft.baseLocation.trim(),
    heroImage: "/memories/trip-hero-usj.jpg",
    giver: "",
    receiver: "",
    owner: { connect: { id: userId } },
  };

  return prisma.trip.create({
    data,
    select: {
      id: true,
      slug: true,
      title: true,
      tripDates: true,
      baseLocation: true,
    },
  });
}
