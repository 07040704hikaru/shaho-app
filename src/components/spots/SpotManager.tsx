"use client";

import { useMemo, useState } from "react";
import { SpotSidebar } from "@/components/spots/SpotSidebar";
import { SpotFormValues } from "@/components/spots/SpotForm";

type SpotRecord = {
  id: string;
  name: string;
  description: string;
  location: string;
  date: string;
};

const INITIAL_SPOTS: SpotRecord[] = [
  {
    id: "spot-umeda-sky",
    name: "梅田スカイビル 空中庭園展望台",
    description: "夕暮れの大阪を一望できる展望台。カフェで一息つけます。",
    location: "大阪市北区大淀中1-1-88",
    date: "2025-05-01T18:30",
  },
  {
    id: "spot-dotonbori",
    name: "道頓堀グリコサイン前",
    description: "旅の定番スポット。写真撮影と食べ歩きを楽しもう。",
    location: "大阪市中央区道頓堀",
    date: "2025-05-02T12:00",
  },
];

function generateSpotId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `spot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

type SpotListProps = {
  spots: SpotRecord[];
  activeSpotId?: string | null;
  onSelect: (spotId: string) => void;
  onEdit: (spotId: string) => void;
};

function SpotList({ spots, activeSpotId, onSelect, onEdit }: SpotListProps) {
  const hasSpots = spots.length > 0;

  if (!hasSpots) {
    return (
      <section className="spot-list spot-list--empty">
        <p>まだスポットがありません。右側のフォームから追加しましょう。</p>
      </section>
    );
  }

  return (
    <section className="spot-list">
      <h2 className="spot-list__title">スポット一覧</h2>
      <ul className="spot-list__items">
        {spots.map((spot) => {
          const isActive = spot.id === activeSpotId;
          return (
            <li key={spot.id} className={`spot-list__item${isActive ? " spot-list__item--active" : ""}`}>
              <button
                type="button"
                className="spot-list__card"
                onClick={() => {
                  onSelect(spot.id);
                  onEdit(spot.id);
                }}
              >
                <div className="spot-list__meta">
                  <span className="spot-list__date">
                    {spot.date ? new Date(spot.date).toLocaleString("ja-JP") : "日時未設定"}
                  </span>
                  <span className="spot-list__location">{spot.location || "所在地未設定"}</span>
                </div>
                <h3 className="spot-list__name">{spot.name || "無題のスポット"}</h3>
                {spot.description ? (
                  <p className="spot-list__description">{spot.description}</p>
                ) : (
                  <p className="spot-list__description spot-list__description--placeholder">
                    説明はまだ入力されていません。
                  </p>
                )}
              </button>
              <div className="spot-list__actions">
                <button
                  type="button"
                  className="spot-list__action spot-list__action--edit"
                  onClick={() => onEdit(spot.id)}
                >
                  編集
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function SpotManager() {
  const [spots, setSpots] = useState<SpotRecord[]>(INITIAL_SPOTS);
  const [activeSpotId, setActiveSpotId] = useState<string | null>(
    INITIAL_SPOTS[0]?.id ?? null,
  );
  const [editingSpotId, setEditingSpotId] = useState<string | null>(null);

  const spotsForSidebar = useMemo(() => spots, [spots]);

  async function handleCreateSpot(values: SpotFormValues) {
    const newSpot: SpotRecord = {
      id: generateSpotId(),
      ...values,
    };
    setSpots((prev) => [...prev, newSpot]);
    setActiveSpotId(newSpot.id);
    setEditingSpotId(newSpot.id);
    return newSpot.id;
  }

  async function handleUpdateSpot(spotId: string, values: SpotFormValues) {
    setSpots((prev) =>
      prev.map((spot) => (spot.id === spotId ? { ...spot, ...values } : spot)),
    );
    setEditingSpotId(null);
  }

  async function handleDeleteSpot(spotId: string) {
    const nextSpots = spots.filter((spot) => spot.id !== spotId);
    setSpots(nextSpots);
    setEditingSpotId((current) => (current === spotId ? null : current));
    setActiveSpotId((current) => {
      if (current !== spotId) {
        return current;
      }
      return nextSpots[0]?.id ?? null;
    });
  }

  return (
    <div className="spot-manager">
      <div className="spot-manager__sidebar">
        <SpotSidebar
          spots={spotsForSidebar}
          activeSpotId={activeSpotId ?? undefined}
          onSelectSpot={(spotId) => setActiveSpotId(spotId)}
          onCreateSpot={handleCreateSpot}
          onUpdateSpot={handleUpdateSpot}
          onDeleteSpot={handleDeleteSpot}
          editingSpotId={editingSpotId}
          onEditingChange={setEditingSpotId}
        />
      </div>
      <div className="spot-manager__content">
        <SpotList
          spots={spots}
          activeSpotId={activeSpotId}
          onSelect={setActiveSpotId}
          onEdit={(spotId) => setEditingSpotId(spotId)}
        />
      </div>
    </div>
  );
}
