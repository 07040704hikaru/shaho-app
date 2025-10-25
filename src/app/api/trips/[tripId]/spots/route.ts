import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  authenticateRequest,
  ensureTripOwnership,
  spotToResponse,
  upsertIsoDateTag,
} from "@/app/api/trips/[tripId]/spots/helpers";
import { SpotDTO } from "@/types/spot";

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

type RouteParams = {
  params: {
    tripId: string;
  };
};

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const user = await authenticateRequest(_request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tripId = params?.tripId?.trim();
    if (!tripId) {
      return NextResponse.json({ error: "Trip ID is required." }, { status: 400 });
    }

    const trip = await ensureTripOwnership(tripId, user.id);
    if (!trip) {
      return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    }

    const spots = await prisma.spot.findMany({
      where: { tripId },
      orderBy: { orderIndex: "asc" },
    });

    const payload: SpotDTO[] = spots.map(spotToResponse);

    return NextResponse.json({ spots: payload });
  } catch (error) {
    console.error("GET /api/trips/[tripId]/spots failed", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tripId = params?.tripId?.trim();
    if (!tripId) {
      return NextResponse.json({ error: "Trip ID is required." }, { status: 400 });
    }

    const trip = await ensureTripOwnership(tripId, user.id);
    if (!trip) {
      return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const body = (payload ?? {}) as Record<string, unknown>;

    const name = safeString(body.name);
    const description = safeString(body.description);
    const location = safeString(body.location);
    const address = safeString(body.address) || location;
    const rawDate = safeString(body.date);

    if (!name) {
      return NextResponse.json({ error: "Spot name is required." }, { status: 400 });
    }

    if (!location) {
      return NextResponse.json({ error: "Spot location is required." }, { status: 400 });
    }

    if (!rawDate) {
      return NextResponse.json({ error: "Spot date is required." }, { status: 400 });
    }

    const parsedDate = new Date(rawDate);
    if (Number.isNaN(parsedDate.valueOf())) {
      return NextResponse.json({ error: "Invalid date format." }, { status: 400 });
    }

    const lastSpot = await prisma.spot.findFirst({
      where: { tripId },
      orderBy: { orderIndex: "desc" },
      select: { orderIndex: true },
    });
    const nextOrderIndex = lastSpot ? lastSpot.orderIndex + 1 : 0;

    const defaultDayLabel = safeString(body.dayLabel) || `Day ${nextOrderIndex + 1}`;
    const defaultDateLabel =
      safeString(body.dateLabel) ||
      new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
      }).format(parsedDate);
    const defaultTime =
      safeString(body.time) ||
      new Intl.DateTimeFormat("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(parsedDate);

    const lat = safeNumber(body.lat ?? body.latitude, 0);
    const lng = safeNumber(body.lng ?? body.longitude, 0);
    const mapX = safeNumber(body.mapX, 0);
    const mapY = safeNumber(body.mapY, 0);
    const unlockRadiusMeters = Math.max(0, Math.round(safeNumber(body.unlockRadiusMeters, 120)));
    const arrivalPoints = Math.max(0, Math.round(safeNumber(body.arrivalPoints, 0)));

    const headline = safeString(body.headline) || `${name} の思い出を作ろう`;
    const memoryBody = safeString(body.memoryBody) || description || `${name} の詳細をここに追加しよう。`;
    const prompt = safeString(body.prompt) || null;
    const message =
      safeString(body.message) ||
      "スポットに着いたらここにカスタムメッセージを追加してください。";
    const note =
      safeString(body.note) || description || "必要に応じてメモを追加してください。";

    const createdSpot = await prisma.spot.create({
      data: {
        tripId,
        orderIndex: nextOrderIndex,
        name,
        dayLabel: defaultDayLabel,
        dateLabel: defaultDateLabel,
        time: defaultTime,
        location,
        address,
        note,
        lat,
        lng,
        mapX,
        mapY,
        unlockRadiusMeters,
        arrivalPoints,
        headline,
        memoryBody,
        prompt: prompt || null,
        message,
        tags: upsertIsoDateTag([], parsedDate.toISOString()),
      },
    });

    return NextResponse.json({ spot: spotToResponse(createdSpot) }, { status: 201 });
  } catch (error) {
    console.error("POST /api/trips/[tripId]/spots failed", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
