import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  authenticateRequest,
  ensureTripOwnership,
  spotToResponse,
  upsertIsoDateTag,
} from "@/app/api/trips/[tripId]/spots/helpers";

type RouteParams = {
  params: {
    tripId: string;
    spotId: string;
  };
};

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tripId = params?.tripId?.trim();
    const spotId = params?.spotId?.trim();
    if (!tripId || !spotId) {
      return NextResponse.json({ error: "Trip ID and Spot ID are required." }, { status: 400 });
    }

    const trip = await ensureTripOwnership(tripId, user.id);
    if (!trip) {
      return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    }

    const existingSpot = await prisma.spot.findFirst({
      where: { id: spotId, tripId },
    });

    if (!existingSpot) {
      return NextResponse.json({ error: "Spot not found." }, { status: 404 });
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    const body = (payload ?? {}) as Record<string, unknown>;

    const name = safeString(body.name) || existingSpot.name;
    const description = safeString(body.description) || existingSpot.note;
    const location = safeString(body.location) || existingSpot.location;
    const address = safeString(body.address) || location;
    const rawDate = safeString(body.date);

    const parsedDate = rawDate ? new Date(rawDate) : null;
    if (rawDate && Number.isNaN(parsedDate?.valueOf() ?? NaN)) {
      return NextResponse.json({ error: "Invalid date format." }, { status: 400 });
    }

    const nextDayLabel =
      safeString(body.dayLabel) || existingSpot.dayLabel;
    const nextDateLabel =
      safeString(body.dateLabel) ||
      (parsedDate
        ? new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
          }).format(parsedDate)
        : existingSpot.dateLabel);
    const nextTime =
      safeString(body.time) ||
      (parsedDate
        ? new Intl.DateTimeFormat("ja-JP", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }).format(parsedDate)
        : existingSpot.time);

    const tags = upsertIsoDateTag(
      existingSpot.tags,
      parsedDate ? parsedDate.toISOString() : null,
    );

    const updatedSpot = await prisma.spot.update({
      where: { id: spotId },
      data: {
        name,
        location,
        address,
        note: description,
        dayLabel: nextDayLabel,
        dateLabel: nextDateLabel,
        time: nextTime,
        tags,
      },
    });

    return NextResponse.json({ spot: spotToResponse(updatedSpot) }, { status: 200 });
  } catch (error) {
    console.error("PATCH /api/trips/[tripId]/spots/[spotId] failed", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tripId = params?.tripId?.trim();
    const spotId = params?.spotId?.trim();
    if (!tripId || !spotId) {
      return NextResponse.json({ error: "Trip ID and Spot ID are required." }, { status: 400 });
    }

    const trip = await ensureTripOwnership(tripId, user.id);
    if (!trip) {
      return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    }

    const existingSpot = await prisma.spot.findFirst({
      where: { id: spotId, tripId },
      select: { id: true },
    });

    if (!existingSpot) {
      return NextResponse.json({ error: "Spot not found." }, { status: 404 });
    }

    await prisma.spot.delete({
      where: { id: spotId },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/trips/[tripId]/spots/[spotId] failed", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
