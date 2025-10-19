"use client";

import { SetStateAction, useEffect, useState } from "react";
import api from "@/lib/axiosInstance";
import { TripList } from "@/components/trips/TripList";
import type { TripDraft } from "@/server/trips/mutations";
import type { TripListItem } from "@/server/trips/queries";
import { useAuthGuard } from "src/hooks/useAuthGuard";
import { useAuth } from "src/context/AuthContext";

export default function TripsPage() {
  const allowed = useAuthGuard();
  const { token } = useAuth();
  const [trips, setTrips] = useState<TripListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!allowed || !token) {
      return;
    }

    let isMounted = true;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.get<{ trips: TripListItem[] }>("/api/trips");
        if (isMounted) {
          setTrips(response.data.trips);
        }
      } catch {
        if (!isMounted) {
          return;
        }
        setError("トリップの取得に失敗しました。");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, [allowed, token]);

  if (!allowed) {
    return null;
  }

  async function handleCreateTrip(draft: TripDraft) {
    await api.post("/api/trips", draft);
    const response = await api.get<{ trips: TripListItem[] }>("/api/trips");
    setTrips(response.data.trips);
  }

  if (isLoading) {
    return <p>読み込み中...</p>;
  }

  if (error) {
    return (
      <main className="page">
        <p>{error}</p>
        <button
          type="button"
          onClick={() =>
            api
              .get<{ trips: TripListItem[] }>("/api/trips")
              .then((response: { data: { trips: SetStateAction<{ id: string; slug: string; title: string; tripDates: string; baseLocation: string; }[]>; }; }) => {
                setTrips(response.data.trips);
                setError(null);
              })
              .catch(() => setError("トリップの取得に失敗しました。"))
          }
        >
          再読み込み
        </button>
      </main>
    );
  }

  return (
    <main className="page">
      <TripList trips={trips} onCreate={handleCreateTrip} />
    </main>
  );
}
