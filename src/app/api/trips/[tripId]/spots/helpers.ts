import { Spot } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserFromToken } from "@/lib/auth/user";
import { SpotDTO } from "@/types/spot";

export const ISO_DATE_TAG_PREFIX = "__spot_iso_date=";

export function readToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) {
    return null;
  }

  const [scheme, value] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !value) {
    return null;
  }

  return value;
}

export async function authenticateRequest(request: Request) {
  const token = readToken(request);
  const user = await getUserFromToken(token);
  return user;
}

export async function ensureTripOwnership(tripId: string, ownerId: string) {
  return prisma.trip.findFirst({
    where: { id: tripId, ownerId },
    select: { id: true },
  });
}

export function extractIsoDate(tags?: string[] | null): string | null {
  if (!tags) {
    return null;
  }
  const entry = tags.find((tag) => tag.startsWith(ISO_DATE_TAG_PREFIX));
  return entry ? entry.slice(ISO_DATE_TAG_PREFIX.length) : null;
}

export function upsertIsoDateTag(tags: string[] | null | undefined, isoDate: string | null) {
  const base = Array.isArray(tags) ? tags.filter((tag) => !tag.startsWith(ISO_DATE_TAG_PREFIX)) : [];
  if (isoDate) {
    base.push(`${ISO_DATE_TAG_PREFIX}${isoDate}`);
  }
  return base;
}

export function spotToResponse(spot: Spot): SpotDTO {
  const isoDate = extractIsoDate(spot.tags);
  return {
    id: spot.id,
    name: spot.name,
    description: spot.note,
    location: spot.location,
    address: spot.address,
    date: isoDate ?? "",
    dayLabel: spot.dayLabel,
    dateLabel: spot.dateLabel,
    time: spot.time,
    orderIndex: spot.orderIndex,
    unlockRadiusMeters: spot.unlockRadiusMeters,
    arrivalPoints: spot.arrivalPoints,
    note: spot.note,
    headline: spot.headline,
    memoryBody: spot.memoryBody,
    prompt: spot.prompt,
    message: spot.message,
  };
}
