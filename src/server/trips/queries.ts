// TODO: Add trip query helpers (listTrips, getTripPlan, etc.).

import { prisma } from "@/lib/prisma";

export async function listTrips(ownerId: string) {
  return prisma.trip.findMany({
    where: { ownerId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      tripDates: true,
      baseLocation: true,
    },
  });
}

export type TripListItem = Awaited<ReturnType<typeof listTrips>>[number];
