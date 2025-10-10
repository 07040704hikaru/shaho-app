import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const tripQuery = Prisma.validator<Prisma.TripDefaultArgs>()({
  include: {
    spots: {
      orderBy: { orderIndex: "asc" },
      include: {
        missions: true,
        photos: {
          orderBy: { orderIndex: "asc" },
        },
      },
    },
  },
});

type TripRecord = Prisma.TripGetPayload<typeof tripQuery>;
type SpotRecord = TripRecord["spots"][number];
type PhotoRecord = SpotRecord["photos"][number];
type MissionRecord = SpotRecord["missions"][number];

function normalizeImageUrl(url: string): string {
  if (!url) {
    return url;
  }
  return url
    .replace(/\.JPG$/i, ".jpg")
    .replace(/\.JPEG$/i, ".jpeg")
    .replace(/\.PNG$/i, ".png");
}

export interface TripPhoto {
  id: string;
  src: string;
  alt: string;
  caption?: string;
}

export interface TripMemory {
  headline: string;
  body: string;
  prompt?: string;
  message: string;
}

export interface MapPosition {
  lat: number;
  lng: number;
  mapX: number;
  mapY: number;
}

export interface TripSpot {
  id: string;
  name: string;
  dayLabel: string;
  dateLabel: string;
  time: string;
  location: string;
  address: string;
  note: string;
  coordinates: MapPosition;
  unlockRadiusMeters: number;
  arrivalPoints: number;
  memory: TripMemory;
  photos: TripPhoto[];
  missions: TripMission[];
}

export interface TripPlan {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  dedication: string;
  tripDates: string;
  baseLocation: string;
  heroImage: string;
  travellers: {
    giver: string;
    receiver: string;
  };
  soundtrackUrl?: string;
  spots: TripSpot[];
}

export type MissionType = "PHOTO" | "CHECKIN" | "QUEST";

export interface TripMission {
  id: string;
  title: string;
  type: MissionType;
  description: string;
  rewardPoints: number;
  photoPrompt?: string;
  checklistLabel?: string;
}

export async function getTripPlan(
  slug = "osaka-birthday-adventure",
): Promise<TripPlan | null> {
  const trip = (await prisma.trip.findUnique({
    where: { slug },
    ...tripQuery,
  })) as TripRecord | null;

  if (!trip) {
    return null;
  }

  return {
    id: trip.id,
    slug: trip.slug,
    title: trip.title,
    subtitle: trip.subtitle,
    dedication: trip.dedication,
    tripDates: trip.tripDates,
    baseLocation: trip.baseLocation,
    heroImage: normalizeImageUrl(trip.heroImage),
    travellers: {
      giver: trip.giver,
      receiver: trip.receiver,
    },
    soundtrackUrl: trip.soundtrackUrl ?? undefined,
    spots: trip.spots.map((spot: SpotRecord): TripSpot => ({
      id: spot.id,
      name: spot.name,
      dayLabel: spot.dayLabel,
      dateLabel: spot.dateLabel,
      time: spot.time,
      location: spot.location,
      address: spot.address,
      note: spot.note,
      coordinates: {
        lat: spot.lat,
        lng: spot.lng,
        mapX: spot.mapX,
        mapY: spot.mapY,
      },
      unlockRadiusMeters: spot.unlockRadiusMeters,
      arrivalPoints: spot.arrivalPoints,
      memory: {
        headline: spot.headline,
        body: spot.memoryBody,
        prompt: spot.prompt ?? undefined,
        message: spot.message,
      },
      photos: spot.photos.map((photo: PhotoRecord): TripPhoto => ({
        id: photo.id,
        src: normalizeImageUrl(photo.imageUrl),
        alt: photo.alt,
        caption: photo.caption ?? undefined,
      })),
      missions: spot.missions.map((mission: MissionRecord): TripMission => ({
        id: mission.id,
        title: mission.title,
        type: mission.type as MissionType,
        description: mission.description,
        rewardPoints: mission.rewardPoints,
        photoPrompt: mission.photoPrompt ?? undefined,
        checklistLabel: mission.checklistLabel ?? undefined,
      })),
    })),
  };
}
