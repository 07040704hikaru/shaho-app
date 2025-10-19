import { NextResponse } from "next/server";
import { listTrips } from "@/server/trips/queries";
import { createTrip } from "@/server/trips/mutations";
import { getUserFromToken } from "@/lib/auth/user";

function readToken(request: Request): string | null {
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

export async function GET(request: Request) {
  try {
    const token = readToken(request);
    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const trips = await listTrips(user.id);
    return NextResponse.json({ trips });
  } catch (error) {
    console.error("GET /api/trips failed", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const token = readToken(request);
    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, slug, tripDates, baseLocation } = body ?? {};

    await createTrip(user.id, {
      title: String(title ?? "").trim(),
      slug: slug ? String(slug) : undefined,
      tripDates: String(tripDates ?? ""),
      baseLocation: String(baseLocation ?? ""),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/trips failed", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
