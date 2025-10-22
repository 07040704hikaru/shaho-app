// TODO: Add spot mutation helpers (createSpot, updateSpot, reorderSpots, etc.).

import { prisma } from "@/lib/prisma";
import { Spot } from "@prisma/client";

export const createSpot = (spot: Spot) => {
  return prisma.spot.create({
    data: spot,
  });
};

export const updateSpot = (id: string, spot: Partial<Spot>) => {
  return prisma.spot.update({
    where: { id },
    data: spot,
  });
};

export const deleteSpot = (id: string) => {
  return prisma.spot.delete({
    where: { id },
  });
};
