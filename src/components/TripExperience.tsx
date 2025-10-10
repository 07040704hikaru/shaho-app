"use client";

import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TripMission, TripPlan, TripSpot } from "@/data/tripPlan";
import { TripMap } from "@/components/TripMap";
import { MemoryGallery } from "@/components/MemoryGallery";

type GeoStatus = "idle" | "tracking" | "denied" | "unsupported";

interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number;
}

interface TripExperienceProps {
  plan: TripPlan | null;
}

interface PersistedTripProgress {
  manualUnlocks?: string[];
  completedMissions?: string[];
  awardedArrivals?: string[];
  version?: number;
}

function TripExperienceInner({ plan }: { plan: TripPlan }) {
  const rawSpots = useMemo(() => plan.spots ?? [], [plan]);

  const alphabeticalSpots = useMemo(() => {
    return [...rawSpots].sort((a, b) => a.name.localeCompare(b.name));
  }, [rawSpots]);

  const [customOrder, setCustomOrder] = useState<string[]>([]);
  const [customLabels, setCustomLabels] = useState<Record<string, string>>({});
  const allSpotIds = useMemo(() => rawSpots.map((spot) => spot.id), [rawSpots]);
  const defaultOrderIds = useMemo(
    () => alphabeticalSpots.map((spot) => spot.id),
    [alphabeticalSpots],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    }),
  );

  useEffect(() => {
    setCustomOrder((prev) => prev.filter((id) => allSpotIds.includes(id)));
    setCustomLabels((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((id) => {
        if (!allSpotIds.includes(id)) {
          delete next[id];
        }
      });
      return next;
    });
  }, [allSpotIds]);

  const orderedSpots = useMemo(() => {
    if (!customOrder.length) {
      return alphabeticalSpots;
    }
    const idToSpot = new Map(rawSpots.map((spot) => [spot.id, spot]));
    const ordered: TripSpot[] = [];
    customOrder.forEach((id) => {
      const spot = idToSpot.get(id);
      if (spot) {
        ordered.push(spot);
      }
    });
    const existingIds = new Set(ordered.map((spot) => spot.id));
    alphabeticalSpots.forEach((spot) => {
      if (!existingIds.has(spot.id)) {
        ordered.push(spot);
      }
    });
    return ordered;
  }, [alphabeticalSpots, customOrder, rawSpots]);

  const [activeSpotId, setActiveSpotId] = useState(
    orderedSpots[0]?.id ?? "no-spots",
  );
  const [geoStatus, setGeoStatus] = useState<GeoStatus>("idle");
  const [geoError, setGeoError] = useState<string | null>(null);
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [manualUnlocks, setManualUnlocks] = useState<Set<string>>(
    () => new Set(),
  );
  const [recentlyUnlocked, setRecentlyUnlocked] = useState<Set<string>>(
    () => new Set(),
  );
  const [awardedArrivals, setAwardedArrivals] = useState<Set<string>>(
    () => new Set(),
  );
  const [completedMissions, setCompletedMissions] = useState<Set<string>>(
    () => new Set(),
  );
  const storageKey = useMemo(
    () => `trip-progress-${plan.id}`,
    [plan.id],
  );
  const stateHydratedRef = useRef(false);
  const skipNextPersistRef = useRef(true);
  const previousUnlocked = useRef<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"map" | "spots">("map");

  const totalPotentialPoints = useMemo(() => {
    return rawSpots.reduce((sum, spot) => {
      const arrival = spot.arrivalPoints ?? 0;
      const missionPoints = spot.missions.reduce(
        (missionSum, mission) => missionSum + mission.rewardPoints,
        0,
      );
      return sum + arrival + missionPoints;
    }, 0);
  }, [rawSpots]);

  const allMissionIds = useMemo(() => {
    return rawSpots.flatMap((spot) =>
      spot.missions.map((mission) => mission.id),
    );
  }, [rawSpots]);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setGeoStatus("unsupported");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (result) => {
        setGeoStatus("tracking");
        setGeoError(null);
        setPosition({
          lat: result.coords.latitude,
          lng: result.coords.longitude,
          accuracy: result.coords.accuracy,
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setGeoStatus("denied");
          setGeoError("位置情報のアクセスが拒否されました。");
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setGeoStatus("idle");
          setGeoError("現在地を取得できませんでした。");
        } else if (error.code === error.TIMEOUT) {
          setGeoStatus("idle");
          setGeoError("位置情報の取得がタイムアウトしました。");
        } else {
          setGeoStatus("idle");
          setGeoError("位置情報の取得中にエラーが発生しました。");
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 30_000,
        timeout: 15_000,
      },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const geoUnlocked = useMemo(() => {
    if (!position) {
      return new Set<string>();
    }

    const unlockedIds = rawSpots
      .filter((spot) => {
        const distance = distanceInMeters(position, spot);
        return distance <= spot.unlockRadiusMeters;
      })
      .map((spot) => spot.id);

    return new Set(unlockedIds);
  }, [rawSpots, position]);

  const unlockedSpotIds = useMemo(() => {
    const merged = new Set<string>();
    geoUnlocked.forEach((id) => merged.add(id));
    manualUnlocks.forEach((id) => merged.add(id));
    return merged;
  }, [geoUnlocked, manualUnlocks]);

  useEffect(() => {
    const prev = previousUnlocked.current;
    const newlyUnlocked: string[] = [];

    unlockedSpotIds.forEach((id) => {
      if (!prev.has(id)) {
        newlyUnlocked.push(id);
      }
    });

    const timeouts: number[] = [];

    if (newlyUnlocked.length) {
      setRecentlyUnlocked((prevSet) => {
        const next = new Set(prevSet);
        newlyUnlocked.forEach((id) => next.add(id));
        return next;
      });

      setAwardedArrivals((prevSet) => {
        const next = new Set(prevSet);
        newlyUnlocked.forEach((id) => {
          if (!next.has(id)) {
            next.add(id);
          }
        });
        return next;
      });

      newlyUnlocked.forEach((id) => {
        const timeoutId = window.setTimeout(() => {
          setRecentlyUnlocked((prevSet) => {
            const next = new Set(prevSet);
            next.delete(id);
            return next;
          });
        }, 1600);
        timeouts.push(timeoutId);
      });
    }

    previousUnlocked.current = new Set(unlockedSpotIds);

    return () => {
      timeouts.forEach((id) => window.clearTimeout(id));
    };
  }, [unlockedSpotIds, rawSpots]);

  useEffect(() => {
    if (!orderedSpots.length) {
      return;
    }

    // Ensure the active spot always exists.
    const stillExists = orderedSpots.some((spot) => spot.id === activeSpotId);
    if (!stillExists) {
      setActiveSpotId(orderedSpots[0].id);
    }
  }, [orderedSpots, activeSpotId]);

  const activeSpot =
    orderedSpots.find((spot) => spot.id === activeSpotId) ?? orderedSpots[0];

  useEffect(() => {
    if (recentlyUnlocked.size === 0) {
      return;
    }
    const newUnlocks = Array.from(recentlyUnlocked);
    const latestUnlockedId = newUnlocks[newUnlocks.length - 1];
    if (latestUnlockedId && latestUnlockedId !== activeSpotId) {
      setActiveSpotId(latestUnlockedId);
    }
  }, [recentlyUnlocked, activeSpotId]);

  const toggleManualUnlock = (spotId: string) => {
    setManualUnlocks((prev) => {
      const next = new Set(prev);
      if (next.has(spotId)) {
        next.delete(spotId);
      } else {
        next.add(spotId);
      }
      return next;
    });
  };

  const getSpotDistance = (spot: TripSpot) => {
    if (!position) return null;
    return distanceInMeters(position, spot);
  };

  const geolocationMessage = (() => {
    if (geoStatus === "unsupported") {
      return "お使いの端末では位置情報が利用できません。手動で開放できます。";
    }
    if (geoStatus === "denied") {
      return "位置情報の許可が必要です。ブラウザの設定で許可した後、このページを再読み込みしてください。";
    }
    if (geoStatus === "idle") {
      return "位置情報を取得しています…少し待ってね。";
    }
    return "現在地を追跡中。スポットの近くで自動的に開放されます。";
  })();

  const handleMissionComplete = (mission: TripMission) => {
    setCompletedMissions((prev) => {
      if (prev.has(mission.id)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(mission.id);
      return next;
    });
  };

  const earnedPoints = useMemo(() => {
    const spotIndex = new Map(rawSpots.map((spot) => [spot.id, spot]));
    let arrivalTotal = 0;
    awardedArrivals.forEach((spotId) => {
      const spot = spotIndex.get(spotId);
      if (spot?.arrivalPoints) {
        arrivalTotal += spot.arrivalPoints;
      }
    });

    const missionIndex = new Map(
      rawSpots.flatMap((spot) =>
        spot.missions.map((mission) => [mission.id, mission] as const),
      ),
    );

    let missionTotal = 0;
    completedMissions.forEach((missionId) => {
      const mission = missionIndex.get(missionId);
      if (mission?.rewardPoints) {
        missionTotal += mission.rewardPoints;
      }
    });

    return arrivalTotal + missionTotal;
  }, [awardedArrivals, completedMissions, rawSpots]);

  const completionRate =
    totalPotentialPoints > 0
      ? Math.min(100, Math.round((earnedPoints / totalPotentialPoints) * 100))
      : 0;

  const handleLabelChange = useCallback(
    (spotId: string, label: string | null) => {
      const trimmed = label?.trim().slice(0, 3) ?? "";
      setCustomLabels((prev) => {
        const next = { ...prev };
        if (!trimmed) {
          delete next[spotId];
        } else {
          next[spotId] = trimmed;
        }
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    stateHydratedRef.current = false;
    skipNextPersistRef.current = true;

    setManualUnlocks(new Set());
    setAwardedArrivals(new Set());
    setCompletedMissions(new Set());

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as PersistedTripProgress;
      if (!parsed || typeof parsed !== "object") {
        return;
      }

      const validSpotIds = new Set(allSpotIds);
      const validMissionIds = new Set(allMissionIds);

      if (Array.isArray(parsed.manualUnlocks)) {
        setManualUnlocks(
          new Set(
            parsed.manualUnlocks.filter(
              (id): id is string =>
                typeof id === "string" && validSpotIds.has(id),
            ),
          ),
        );
      }

      if (Array.isArray(parsed.awardedArrivals)) {
        setAwardedArrivals(
          new Set(
            parsed.awardedArrivals.filter(
              (id): id is string =>
                typeof id === "string" && validSpotIds.has(id),
            ),
          ),
        );
      }

      if (Array.isArray(parsed.completedMissions)) {
        setCompletedMissions(
          new Set(
            parsed.completedMissions.filter(
              (id): id is string =>
                typeof id === "string" && validMissionIds.has(id),
            ),
          ),
        );
      }
    } catch (error) {
      console.warn("旅の進行状況を読み込めませんでした。", error);
    } finally {
      stateHydratedRef.current = true;
    }
  }, [allMissionIds, allSpotIds, storageKey]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !stateHydratedRef.current
    ) {
      return;
    }

    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }

    const payload: PersistedTripProgress = {
      version: 1,
      manualUnlocks: Array.from(manualUnlocks),
      completedMissions: Array.from(completedMissions),
      awardedArrivals: Array.from(awardedArrivals),
    };

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (error) {
      console.warn("旅の進行状況を保存できませんでした。", error);
    }
  }, [
    awardedArrivals,
    completedMissions,
    manualUnlocks,
    storageKey,
  ]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) {
        return;
      }

      setCustomOrder((prev) => {
        const base = prev.length ? [...prev] : [...defaultOrderIds];
        const cleaned = base.filter((id) => allSpotIds.includes(id));
        const activeId = String(active.id);
        const overId = String(over.id);

        if (!cleaned.includes(activeId)) {
          cleaned.push(activeId);
        }
        if (!cleaned.includes(overId)) {
          cleaned.push(overId);
        }

        const oldIndex = cleaned.indexOf(activeId);
        const newIndex = cleaned.indexOf(overId);
        if (oldIndex === -1 || newIndex === -1) {
          return cleaned;
        }

        return arrayMove(cleaned, oldIndex, newIndex);
      });
    },
    [allSpotIds, defaultOrderIds],
  );

  if (!plan) {
    return (
      <div className="experience experience--empty">
        <p>まだ旅の計画が登録されていません。</p>
        <p>Prismaで旅のデータを作成してからもう一度読み込んでください。</p>
      </div>
    );
  }

  return (
    <div className="experience">
      <section className="hero">
        <div className="hero__content">
          <p className="hero__eyebrow">{plan.tripDates}</p>
          <h1>{plan.title}</h1>
          <p className="hero__subtitle">{plan.subtitle}</p>
          {plan.dedication && (
            <p className="hero__dedication">{plan.dedication}</p>
          )}
          <div className="hero__meta">
            <span>{plan.baseLocation}</span>
            <span>
              {plan.travellers.giver} → {plan.travellers.receiver}
            </span>
          </div>
          <div className="scoreboard">
            <div className="scoreboard__points">
              <strong>{earnedPoints} pt</strong>
              <span>獲得ポイント</span>
            </div>
            <div className="scoreboard__progress">
              <div className="scoreboard__progress-bar">
                <div
                  className="scoreboard__progress-fill"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
              <span>
                完成度 {completionRate}% / 合計 {totalPotentialPoints} pt
              </span>
            </div>
          </div>
        </div>
        <div className="hero__art">
          <img
            src={plan.heroImage}
            alt="Trip mood illustration"
            className="hero__image"
          />
        </div>
      </section>

      <div className="view-toggle" role="tablist" aria-label="旅の表示を選択">
        <button
          type="button"
          role="tab"
          id="view-tab-map"
          aria-controls="view-panel-map"
          className={`view-toggle__button${
            viewMode === "map" ? " view-toggle__button--active" : ""
          }`}
          onClick={() => setViewMode("map")}
          aria-selected={viewMode === "map"}
        >
          地図で見る
        </button>
        <button
          type="button"
          role="tab"
          id="view-tab-spots"
          aria-controls="view-panel-spots"
          className={`view-toggle__button${
            viewMode === "spots" ? " view-toggle__button--active" : ""
          }`}
          onClick={() => setViewMode("spots")}
          aria-selected={viewMode === "spots"}
        >
          スポット一覧
        </button>
      </div>

      <section className="layout">
        {viewMode === "map" && (
          <div
            className="layout__panel layout__panel--map"
            role="tabpanel"
            id="view-panel-map"
            aria-labelledby="view-tab-map"
        >
            <TripMap
              spots={orderedSpots}
              activeSpotId={activeSpot?.id ?? orderedSpots[0]?.id ?? "no-spots"}
              unlockedSpotIds={unlockedSpotIds}
              recentlyUnlocked={recentlyUnlocked}
              onSelect={setActiveSpotId}
              customLabels={customLabels}
              onLabelChange={handleLabelChange}
            />
            <div className="geolocation-status">
              <p>{geolocationMessage}</p>
              {geoError && (
                <span className="geolocation-status__error">{geoError}</span>
              )}
              {position && (
                <span className="geolocation-status__detail">
                  現在地精度: ±{Math.round(position.accuracy)}m
                </span>
              )}
            </div>
            <div className="geolocation-hint">
              <p>
                手動開放する場合は、スポットカードの「解放をシミュレート」を使ってください。
                実際のサプライズではカードを封筒に入れておき、到着後に開けてもらうのがおすすめ。
              </p>
            </div>
          </div>
        )}

        {viewMode === "spots" && (
          <div
            className="layout__panel layout__panel--timeline"
            role="tabpanel"
            id="view-panel-spots"
            aria-labelledby="view-tab-spots"
          >
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={orderedSpots.map((spot) => spot.id)}
                strategy={verticalListSortingStrategy}
              >
                <ol className="timeline">
                  {orderedSpots.map((spot) => {
                    const distance = getSpotDistance(spot);
                    const unlocked = unlockedSpotIds.has(spot.id);
                    const isActive = activeSpot?.id === spot.id;
                    const unlocking = recentlyUnlocked.has(spot.id);
                    const timelineLabel = (
                      customLabels[spot.id]?.trim() ||
                      spot.name.trim().charAt(0) ||
                      "★"
                    ).slice(0, 3);
                    const timelineImage = spot.photos[0]?.src;

                    return (
                      <SortableTimelineItem
                        key={spot.id}
                        spot={spot}
                        isActive={isActive}
                        unlocked={unlocked}
                        unlocking={unlocking}
                        distance={distance}
                        arrivalAwarded={awardedArrivals.has(spot.id)}
                        manualUnlocked={manualUnlocks.has(spot.id)}
                        onSelect={setActiveSpotId}
                        onToggleManual={toggleManualUnlock}
                        onMissionComplete={handleMissionComplete}
                        completedMissionIds={completedMissions}
                        timelineLabel={timelineLabel}
                        timelineImage={timelineImage}
                      />
                    );
                  })}
                </ol>
              </SortableContext>
            </DndContext>
          </div>
        )}
      </section>

    </div>
  );
}

function TripExperienceFallback() {
  return (
    <section className="experience experience--error" role="alert">
      <div className="experience__error-card">
        <h1>旅のデータを読み込めませんでした</h1>
        <p>
          データベースに接続できないか、まだ旅のプランが登録されていません。
          <br />
          PostgreSQL を起動して <code>npm run db:seed</code> を実行したあと、ページを再読み込みしてください。
        </p>
      </div>
    </section>
  );
}

export function TripExperience({ plan }: TripExperienceProps) {
  if (!plan) {
    return <TripExperienceFallback />;
  }
  return <TripExperienceInner plan={plan} />;
}

interface SortableTimelineItemProps {
  spot: TripSpot;
  isActive: boolean;
  unlocked: boolean;
  unlocking: boolean;
  manualUnlocked: boolean;
  distance: number | null;
  arrivalAwarded: boolean;
  onSelect: (spotId: string) => void;
  onToggleManual: (spotId: string) => void;
  onMissionComplete: (mission: TripMission) => void;
  completedMissionIds: Set<string>;
  timelineLabel: string;
  timelineImage?: string;
}

function SortableTimelineItem({
  spot,
  isActive,
  unlocked,
  unlocking,
  manualUnlocked,
  distance,
  arrivalAwarded,
  onSelect,
  onToggleManual,
  onMissionComplete,
  completedMissionIds,
  timelineLabel,
  timelineImage,
}: SortableTimelineItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: spot.id });
  const { ["aria-pressed"]: _ariaPressed, ...sortableAttributes } = attributes;
  void _ariaPressed;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const indexClass = timelineImage
    ? "timeline__index timeline__index--photo"
    : "timeline__index";
  const indexStyle = timelineImage ? { backgroundImage: `url(${timelineImage})` } : undefined;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`timeline__item${isActive ? " timeline__item--active" : ""}${
        unlocked ? " timeline__item--unlocked" : " timeline__item--compact"
      }${unlocking ? " timeline__item--unlocking" : ""}${
        isDragging ? " timeline__item--dragging" : ""
      }`}
    >
      <button
        ref={setActivatorNodeRef}
        className="timeline__select"
        onClick={() => onSelect(spot.id)}
        type="button"
        aria-pressed={isActive}
        {...sortableAttributes}
        {...listeners}
      >
        <span className={indexClass} aria-hidden="true" style={indexStyle}>
          {!timelineImage && timelineLabel}
        </span>
        <div className="timeline__labels">
          <span className="timeline__day">
            {spot.dayLabel} ・ {spot.dateLabel}
          </span>
          <strong>{spot.name}</strong>
          <span className="timeline__meta">
            {spot.time} / {spot.location}
          </span>
        </div>
      </button>
      {unlocked ? (
        <>
          <div className="timeline__status">
            <span
              className={`timeline__badge${
                unlocking ? " timeline__badge--unlocking" : ""
              } timeline__badge--open`}
            >
              <span className="lock-icon" aria-hidden />
              <span className="unlock-confetti" aria-hidden />
              解放済み
            </span>
            {spot.arrivalPoints > 0 && (
              <span className="timeline__points">
                到着ボーナス +{spot.arrivalPoints}pt
              </span>
            )}
            {distance !== null && (
              <span className="timeline__distance">
                現在地から {formatDistance(distance)}
              </span>
            )}
          </div>
          <div className="timeline__actions">
            <button
              className="timeline__simulate"
              onClick={() => onToggleManual(spot.id)}
              type="button"
            >
              {manualUnlocked ? "ロックを戻す" : "解放をシミュレート"}
            </button>
          </div>
          {isActive && (
            <SpotDetail
              spot={spot}
              unlocked={unlocked}
              unlocking={unlocking}
              distance={distance}
              arrivalAwarded={arrivalAwarded}
              onMissionComplete={onMissionComplete}
              completedMissionIds={completedMissionIds}
            />
          )}
        </>
      ) : (
        <div className="timeline__collapsed">
          <div className="timeline__collapsed-info">
            <span
              className={`timeline__badge${
                unlocking ? " timeline__badge--unlocking" : ""
              }`}
            >
              <span className="lock-icon" aria-hidden />
              ロック中
            </span>
            {distance !== null && (
              <span className="timeline__distance">
                現在地から {formatDistance(distance)}
              </span>
            )}
            <span className="timeline__collapsed-note">
              ミッションをクリアするとメッセージが開きます
            </span>
          </div>
          <button
            className="timeline__simulate"
            onClick={() => onToggleManual(spot.id)}
            type="button"
          >
            解放をシミュレート
          </button>
        </div>
      )}
    </li>
  );
}

interface SpotDetailProps {
  spot: TripSpot;
  unlocked: boolean;
  unlocking: boolean;
  distance: number | null;
  arrivalAwarded: boolean;
  onMissionComplete: (mission: TripMission) => void;
  completedMissionIds: Set<string>;
}

function SpotDetail({
  spot,
  unlocked,
  unlocking,
  distance,
  arrivalAwarded,
  onMissionComplete,
  completedMissionIds,
}: SpotDetailProps) {
  const badgeClass = `spot-detail__badge${
    unlocking ? " spot-detail__badge--unlocking" : ""
  }${unlocked ? " spot-detail__badge--open" : ""}`;
  const allMissionsComplete =
    spot.missions.length === 0 ||
    spot.missions.every((mission) => completedMissionIds.has(mission.id));
  const canReveal = unlocked && allMissionsComplete;

  return (
    <article
      className={`spot-detail${unlocked ? " spot-detail--unlocked" : ""}`}
      aria-live="polite"
    >
      <div className="spot-detail__header">
        <div>
          <h3>{spot.name}</h3>
          <p>
            {spot.time} ・ {spot.location}
          </p>
        </div>
        <div className={badgeClass}>
          <span className="lock-icon" aria-hidden />
          <span className="unlock-confetti" aria-hidden />
          {unlocked ? "開放済み" : "ロック中"}
        </div>
      </div>
      <p className="spot-detail__note">{spot.note}</p>

      {!unlocked && (
        <div className="spot-detail__locked-hint">
          <p>スポットに着いたらカードを開けよう。</p>
          {distance !== null && (
            <span>あと {formatDistance(distance)} で解放されます。</span>
          )}
        </div>
      )}

      {unlocked && (
        <>
          {spot.arrivalPoints > 0 && (
            <div className="spot-detail__arrival">
              <strong>
                到着ボーナス +{spot.arrivalPoints}pt
                {arrivalAwarded ? "（獲得済み！）" : ""}
              </strong>
            </div>
          )}
          {spot.missions.length > 0 && (
            <div className="spot-missions">
              <h4>ミッション</h4>
              <ul className="spot-missions__list">
                {spot.missions.map((mission) => {
                  const completed = completedMissionIds.has(mission.id);
                  return (
                    <li
                      key={mission.id}
                      className={`spot-missions__item spot-missions__item--${mission.type.toLowerCase()}`}
                    >
                      <div>
                        <span className="spot-missions__type">📷 フォト</span>
                        <p className="spot-missions__title">写真を撮ろう！</p>
                      </div>
                      <button
                        className="spot-missions__action"
                        onClick={() => onMissionComplete(mission)}
                        disabled={completed}
                      >
                        {completed
                          ? "達成済み！"
                          : `+${mission.rewardPoints}pt でクリア`}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {canReveal ? (
            <>
              <div className="spot-detail__memory">
                <p className="spot-detail__eyebrow">{spot.memory.headline}</p>
                <p>{spot.memory.body}</p>
              </div>
              <div className="spot-detail__message">
                <h4>手紙メッセージ</h4>
                <p>{spot.memory.message}</p>
              </div>
              <MemoryGallery photos={spot.photos} />
            </>
          ) : (
            <div className="spot-detail__secret">
              <h4>メッセージはミッションクリアで解放！</h4>
              <p>
                カードの指令をコンプリートすると、ここで特別なメッセージと思い出写真が開きます。
              </p>
            </div>
          )}
        </>
      )}
    </article>
  );
}

function distanceInMeters(position: GeoPosition, spot: TripSpot) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusMeters = 6_371_000;

  const dLat = toRad(spot.coordinates.lat - position.lat);
  const dLng = toRad(spot.coordinates.lng - position.lng);

  const lat1 = toRad(position.lat);
  const lat2 = toRad(spot.coordinates.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) *
      Math.sin(dLng / 2) *
      Math.cos(lat1) *
      Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMeters * c;
}

function formatDistance(meters: number) {
  if (meters < 1000) {
    return `${Math.max(1, Math.round(meters))} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}
