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
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
  type TouchEvent,
  type PointerEvent,
  type SyntheticEvent,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { TripMission, TripPhoto, TripPlan, TripSpot } from "@/data/tripPlan";
import { TripMap } from "@/components/TripMap";
import { MemoryGallery } from "@/components/MemoryGallery";
import { resolveSpotIcon, resolveSpotMemoryPhoto } from "@/data/spotIcons";
import { SpotForm, SpotFormValues } from "@/components/spots/SpotForm";
import api from "@/lib/axiosInstance";
import { SpotDTO } from "@/types/spot";
import { useAuth } from "@/context/AuthContext";

const MAX_CUSTOM_PHOTOS = 3;
type CustomPhotoEntry = { src: string; caption?: string };
type PhotoDraft = { src: string; caption: string };

function suppressEventPropagation(event: SyntheticEvent) {
  event.stopPropagation();
  const nativeEvent = event.nativeEvent as {
    stopImmediatePropagation?: () => void;
  };
  nativeEvent.stopImmediatePropagation?.();
}

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
  customMessages?: Record<string, string>;
  customPhotos?: Record<string, Array<CustomPhotoEntry | string>>;
  version?: number;
}

function TripExperienceInner({ plan }: { plan: TripPlan }) {
  const rawSpots = useMemo(() => plan.spots ?? [], [plan]);

  const alphabeticalSpots = useMemo(() => {
    return [...rawSpots].sort((a, b) => a.name.localeCompare(b.name));
  }, [rawSpots]);

  const router = useRouter();
  const { token } = useAuth();
  const [isManagingSpots, setIsManagingSpots] = useState(false);
  const [manageSpots, setManageSpots] = useState<SpotDTO[]>([]);
  const [isManageLoading, setIsManageLoading] = useState(false);
  const [manageError, setManageError] = useState<string | null>(null);
  const [editingManageSpot, setEditingManageSpot] = useState<SpotDTO | null>(null);
  const [isManageFormOpen, setIsManageFormOpen] = useState(false);

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
  const [customMessages, setCustomMessages] = useState<Record<string, string>>(
    () => ({}),
  );
  const [customPhotos, setCustomPhotos] = useState<
    Record<string, CustomPhotoEntry[]>
  >(
    () => ({}),
  );
  const storageKey = useMemo(
    () => `trip-progress-${plan.id}`,
    [plan.id],
  );
  const stateHydratedRef = useRef(false);
  const skipNextPersistRef = useRef(true);
  const previousUnlocked = useRef<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"map" | "spots">("map");
  const hasProgress = useMemo(() => {
    return (
      manualUnlocks.size > 0 ||
      awardedArrivals.size > 0 ||
      completedMissions.size > 0 ||
      Object.keys(customMessages).length > 0 ||
      Object.values(customPhotos).some((photos) => photos.length > 0)
    );
  }, [
    awardedArrivals,
    completedMissions,
    customMessages,
    customPhotos,
    manualUnlocks,
  ]);

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

  const loadManageSpots = useCallback(async () => {
    setIsManageLoading(true);
    setManageError(null);
    try {
      const response = await api.get<{ spots: SpotDTO[] }>(
        `/api/trips/${plan.id}/spots`,
      );
      const sorted = [...response.data.spots].sort(
        (a, b) => a.orderIndex - b.orderIndex,
      );
      setManageSpots(sorted);
    } catch (error) {
      console.error("Failed to load spots for management", error);
      setManageError("スポットの取得に失敗しました。");
    } finally {
      setIsManageLoading(false);
    }
  }, [plan.id]);

  useEffect(() => {
    if (isManagingSpots) {
      void loadManageSpots();
    }
  }, [isManagingSpots, loadManageSpots]);

  const getFormValuesFromManagedSpot = useCallback((spot: SpotDTO): SpotFormValues => {
    return {
      name: spot.name,
      description: spot.description ?? "",
      location: spot.location,
      date: spot.date ?? "",
    };
  }, []);

  const handleOpenSpotManager = useCallback(() => {
    setIsManagingSpots(true);
    setIsManageFormOpen(false);
    setEditingManageSpot(null);
  }, []);

  const handleCloseSpotManager = useCallback(() => {
    setIsManagingSpots(false);
    setIsManageFormOpen(false);
    setEditingManageSpot(null);
    setManageError(null);
  }, []);

  const handleCreateSpotStart = useCallback(() => {
    setEditingManageSpot(null);
    setIsManageFormOpen(true);
  }, []);

  const handleEditSpotStart = useCallback((spot: SpotDTO) => {
    setEditingManageSpot(spot);
    setIsManageFormOpen(true);
  }, []);

  const handleSubmitManageSpot = useCallback(
    async (values: SpotFormValues) => {
      try {
        if (editingManageSpot) {
          await api.patch(`/api/trips/${plan.id}/spots/${editingManageSpot.id}`, values);
        } else {
          await api.post(`/api/trips/${plan.id}/spots`, values);
        }
        await loadManageSpots();
        setIsManageFormOpen(false);
        setEditingManageSpot(null);
        router.refresh();
      } catch (error) {
        console.error("Failed to create/update spot", error);
        setManageError("スポットの保存に失敗しました。");
      }
    },
    [editingManageSpot, loadManageSpots, plan.id, router],
  );

  const handleDeleteManageSpot = useCallback(
    async (spotId: string) => {
      const confirmed =
        typeof window === "undefined"
          ? true
          : window.confirm("このスポットを削除しますか？元に戻すことはできません。");
      if (!confirmed) {
        return;
      }
      try {
        await api.delete(`/api/trips/${plan.id}/spots/${spotId}`);
        await loadManageSpots();
        if (editingManageSpot?.id === spotId) {
          setEditingManageSpot(null);
          setIsManageFormOpen(false);
        }
        router.refresh();
      } catch (error) {
        console.error("Failed to delete spot", error);
        setManageError("スポットの削除に失敗しました。");
      }
    },
    [editingManageSpot?.id, loadManageSpots, plan.id, router],
  );

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
  const handleSaveCustomContent = useCallback(
    (
      spotId: string,
      { message, photos }: { message: string; photos: CustomPhotoEntry[] },
    ) => {
      setCustomMessages((prev) => {
        const trimmed = message.trim();
        if (!trimmed && !(spotId in prev)) {
          return prev;
        }
        const next = { ...prev };
        if (trimmed) {
          next[spotId] = trimmed;
        } else {
          delete next[spotId];
        }
        return next;
      });
      setCustomPhotos((prev) => {
        const cleaned = photos
          .map((photo) => {
            const src = photo.src.trim();
            const caption = photo.caption?.trim();
            if (!src) {
              return null;
            }
            return caption ? { src, caption } : { src };
          })
          .filter((photo): photo is CustomPhotoEntry => Boolean(photo))
          .slice(0, MAX_CUSTOM_PHOTOS);
        if (!cleaned.length && !(spotId in prev)) {
          return prev;
        }
        const next = { ...prev };
        if (cleaned.length) {
          next[spotId] = cleaned;
        } else {
          delete next[spotId];
        }
        return next;
      });
    },
    [],
  );
  const handleResetCustomContent = useCallback((spotId: string) => {
    setCustomMessages((prev) => {
      if (!(spotId in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[spotId];
      return next;
    });
    setCustomPhotos((prev) => {
      if (!(spotId in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[spotId];
      return next;
    });
  }, []);
  const handleResetProgress = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (hasProgress) {
      const confirmed = window.confirm(
        "進行状況をリセットしますか？ポイントとミッション達成状況がすべてクリアされます。",
      );
      if (!confirmed) {
        return;
      }
    }
    setManualUnlocks(new Set());
    setAwardedArrivals(new Set());
    setCompletedMissions(new Set());
    setRecentlyUnlocked(new Set());
    setCustomMessages({});
    setCustomPhotos({});
    previousUnlocked.current = new Set();
    setActiveSpotId(orderedSpots[0]?.id ?? "no-spots");
    skipNextPersistRef.current = true;
    window.localStorage.removeItem(storageKey);
  }, [hasProgress, orderedSpots, storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    stateHydratedRef.current = false;
    skipNextPersistRef.current = true;

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        setManualUnlocks(new Set());
        setAwardedArrivals(new Set());
        setCompletedMissions(new Set());
        setCustomMessages({});
        setCustomPhotos({});
        return;
      }

      const parsed = JSON.parse(raw) as PersistedTripProgress;
      if (!parsed || typeof parsed !== "object") {
        setManualUnlocks(new Set());
        setAwardedArrivals(new Set());
        setCompletedMissions(new Set());
        setCustomMessages({});
        setCustomPhotos({});
        return;
      }

      const validSpotIds = new Set(allSpotIds);
      const validMissionIds = new Set(allMissionIds);

      const manualUnlockArray = Array.isArray(parsed.manualUnlocks)
        ? parsed.manualUnlocks.filter(
            (id): id is string =>
              typeof id === "string" && validSpotIds.has(id),
          )
        : [];
      const awardedArrivalArray = Array.isArray(parsed.awardedArrivals)
        ? parsed.awardedArrivals.filter(
            (id): id is string =>
              typeof id === "string" && validSpotIds.has(id),
          )
        : [];
      const completedMissionArray = Array.isArray(parsed.completedMissions)
        ? parsed.completedMissions.filter(
            (id): id is string =>
              typeof id === "string" && validMissionIds.has(id),
          )
        : [];

      setManualUnlocks(new Set(manualUnlockArray));
      setAwardedArrivals(new Set(awardedArrivalArray));
      setCompletedMissions(new Set(completedMissionArray));

      const messageEntries =
        parsed.customMessages && typeof parsed.customMessages === "object"
          ? Object.entries(parsed.customMessages).reduce<[string, string][]>(
              (acc, [spotId, message]) => {
                if (
                  typeof spotId === "string" &&
                  typeof message === "string" &&
                  validSpotIds.has(spotId)
                ) {
                  const trimmed = message.trim();
                  if (trimmed) {
                    acc.push([spotId, trimmed]);
                  }
                }
                return acc;
              },
              [],
            )
          : [];

      const photoEntries =
        parsed.customPhotos && typeof parsed.customPhotos === "object"
          ? Object.entries(parsed.customPhotos).reduce<
              [string, CustomPhotoEntry[]][]
            >((acc, [spotId, entries]) => {
              if (
                typeof spotId !== "string" ||
                !validSpotIds.has(spotId) ||
                !Array.isArray(entries)
              ) {
                return acc;
              }
              const cleaned = entries
                .map((entry) => {
                  if (typeof entry === "string") {
                    const src = entry.trim();
                    return src ? { src } : null;
                  }
                  if (entry && typeof entry === "object") {
                    const rawSrc = (entry as { src?: unknown }).src;
                    const src =
                      typeof rawSrc === "string" ? rawSrc.trim() : "";
                    const rawCaption = (entry as { caption?: unknown }).caption;
                    const caption =
                      typeof rawCaption === "string" ? rawCaption.trim() : "";
                    if (!src) {
                      return null;
                    }
                    return caption ? { src, caption } : { src };
                  }
                  return null;
                })
                .filter((entry): entry is CustomPhotoEntry => Boolean(entry))
                .slice(0, MAX_CUSTOM_PHOTOS);
              if (cleaned.length) {
                acc.push([
                  spotId,
                  cleaned.map((photo) =>
                    photo.caption
                      ? { src: photo.src, caption: photo.caption }
                      : { src: photo.src },
                  ),
                ]);
              }
              return acc;
            }, [])
          : [];

      setCustomMessages(Object.fromEntries(messageEntries));
      setCustomPhotos(Object.fromEntries(photoEntries));
    } catch (error) {
      console.warn("旅の進行状況を読み込めませんでした。", error);
      setManualUnlocks(new Set());
      setAwardedArrivals(new Set());
      setCompletedMissions(new Set());
      setCustomMessages({});
      setCustomPhotos({});
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
      version: 3,
      manualUnlocks: Array.from(manualUnlocks),
      completedMissions: Array.from(completedMissions),
      awardedArrivals: Array.from(awardedArrivals),
    };
    if (Object.keys(customMessages).length > 0) {
      payload.customMessages = { ...customMessages };
    }
    if (Object.keys(customPhotos).length > 0) {
      const serialized = Object.entries(customPhotos).reduce<
        Record<string, CustomPhotoEntry[]>
      >((acc, [spotId, photos]) => {
        const cleaned = photos
          .map((photo) => {
            const src = photo.src.trim();
            const caption = photo.caption?.trim();
            if (!src) {
              return null;
            }
            return caption ? { src, caption } : { src };
          })
          .filter((photo): photo is CustomPhotoEntry => Boolean(photo))
          .slice(0, MAX_CUSTOM_PHOTOS);
        if (cleaned.length) {
          acc[spotId] = cleaned;
        }
        return acc;
      }, {});
      if (Object.keys(serialized).length > 0) {
        payload.customPhotos = serialized;
      }
    }

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (error) {
      console.warn("旅の進行状況を保存できませんでした。", error);
    }
  }, [
    awardedArrivals,
    completedMissions,
    customMessages,
    customPhotos,
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
          <div className="scoreboard__actions">
            <button
              type="button"
              className="scoreboard__reset"
              onClick={handleResetProgress}
              disabled={!hasProgress}
            >
              進行状況をリセット
            </button>
          </div>
        </div>
        <div className="hero__art">
          <Image
            src={plan.heroImage}
            alt="Trip mood illustration"
            className="hero__image"
            width={960}
            height={540}
            priority
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

      {token ? (
        <div className="spot-admin__controls">
          <button
            type="button"
            className="spot-admin__button"
            onClick={handleOpenSpotManager}
          >
            スポット管理
          </button>
        </div>
      ) : null}

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
                    const customMessage = customMessages[spot.id];
                    const customPhotoEntries = customPhotos[spot.id] ?? [];
                    const validCustomPhotos = customPhotoEntries.filter(
                      (entry) => entry.src,
                    );
                    const displayPhotos = validCustomPhotos.length
                      ? validCustomPhotos.map((photo, index) => ({
                          id: `custom-${spot.id}-${index}`,
                          src: photo.src,
                          alt:
                            photo.caption ??
                            `${spot.name} カスタム写真 ${index + 1}`,
                          caption: photo.caption ?? undefined,
                        }))
                      : spot.photos;
                    const augmentedSpot: TripSpot = {
                      ...spot,
                      memory: {
                        ...spot.memory,
                        message:
                          customMessage && customMessage.trim()
                            ? customMessage.trim()
                            : spot.memory.message,
                      },
                      photos: displayPhotos,
                    };
                    const iconImage = resolveSpotIcon(spot.name);
                    const fallbackThumbnail =
                      resolveSpotMemoryPhoto(spot.name) ??
                      displayPhotos[0]?.src ??
                      spot.photos[0]?.src ??
                      iconImage;
                    const timelineImage = iconImage ?? fallbackThumbnail;

                    return (
                      <SortableTimelineItem
                        key={spot.id}
                        spot={augmentedSpot}
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
                        defaultMessage={spot.memory.message}
                        defaultPhotos={spot.photos}
                        customMessage={customMessage}
                        customPhotos={validCustomPhotos}
                        onSaveContent={(payload) =>
                          handleSaveCustomContent(spot.id, payload)
                        }
                        onResetContent={() => handleResetCustomContent(spot.id)}
                      />
                    );
                  })}
                </ol>
              </SortableContext>
            </DndContext>
          </div>
        )}
      </section>

      {isManagingSpots ? (
        <div className="spot-admin">
          <div
            className="spot-admin__backdrop"
            onClick={handleCloseSpotManager}
            role="presentation"
          />
          <aside className="spot-admin__panel" role="dialog" aria-modal="true">
            <header className="spot-admin__header">
              <h2 className="spot-admin__title">スポット管理</h2>
              <button
                type="button"
                className="spot-admin__close"
                onClick={handleCloseSpotManager}
              >
                閉じる
              </button>
            </header>

            {manageError ? (
              <div className="spot-admin__status spot-admin__status--error">
                {manageError}
              </div>
            ) : null}
            {isManageLoading ? (
              <div className="spot-admin__status">読み込み中…</div>
            ) : null}

            <div className="spot-admin__actions">
              <button
                type="button"
                className="spot-admin__subbutton"
                onClick={handleCreateSpotStart}
              >
                新規スポットを追加
              </button>
            </div>

            <ul className="spot-admin__list">
              {manageSpots.map((spot) => (
                <li key={spot.id} className="spot-admin__list-item">
                  <h3>{spot.name}</h3>
                  <div className="spot-admin__list-meta">
                    <span>{spot.location}</span>
                    <span>
                      {spot.date
                        ? new Date(spot.date).toLocaleString("ja-JP")
                        : `${spot.dateLabel} ${spot.time}`}
                    </span>
                  </div>
                  <p className="spot-admin__list-description">
                    {spot.description || "説明はまだ登録されていません。"}
                  </p>
                  <div className="spot-admin__list-actions">
                    <button
                      type="button"
                      className="spot-admin__edit"
                      onClick={() => handleEditSpotStart(spot)}
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      className="spot-admin__delete"
                      onClick={() => void handleDeleteManageSpot(spot.id)}
                    >
                      削除
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {isManageFormOpen ? (
              <div className="spot-admin__form">
                <SpotForm
                  mode={editingManageSpot ? "edit" : "create"}
                  spotId={editingManageSpot?.id}
                  initialValues={
                    editingManageSpot
                      ? getFormValuesFromManagedSpot(editingManageSpot)
                      : undefined
                  }
                  onSubmit={handleSubmitManageSpot}
                  onCancel={() => {
                    setIsManageFormOpen(false);
                    setEditingManageSpot(null);
                  }}
                  submitLabel={editingManageSpot ? "変更を保存" : "スポットを追加"}
                />
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}
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

type SpotContentPayload = {
  message: string;
  photos: CustomPhotoEntry[];
};

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
  defaultMessage: string;
  defaultPhotos: TripPhoto[];
  customMessage?: string;
  customPhotos: CustomPhotoEntry[];
  onSaveContent: (payload: SpotContentPayload) => void;
  onResetContent: () => void;
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
  defaultMessage,
  defaultPhotos,
  customMessage,
  customPhotos,
  onSaveContent,
  onResetContent,
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
  const indexStyle = timelineImage
    ? { backgroundImage: `url(${timelineImage})` }
    : undefined;
  const suppressPropagation = useCallback(suppressEventPropagation, []);
  const handleManualToggle = useCallback(
    (
      event:
        | MouseEvent<HTMLButtonElement>
        | TouchEvent<HTMLButtonElement>
        | PointerEvent<HTMLButtonElement>,
    ) => {
      event.preventDefault();
      event.stopPropagation();
      const nativeEvent = event.nativeEvent as {
        stopImmediatePropagation?: () => void;
      };
      nativeEvent.stopImmediatePropagation?.();
      onToggleManual(spot.id);
    },
    [onToggleManual, spot.id],
  );

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
              type="button"
              onClick={handleManualToggle}
              onMouseDown={suppressPropagation}
              onPointerDown={suppressPropagation}
              onTouchStart={suppressPropagation}
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
              defaultMessage={defaultMessage}
              defaultPhotos={defaultPhotos}
              customMessage={customMessage}
              customPhotos={customPhotos}
              onSaveContent={onSaveContent}
              onResetContent={onResetContent}
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
        type="button"
        onClick={handleManualToggle}
        onMouseDown={suppressPropagation}
        onPointerDown={suppressPropagation}
        onTouchStart={suppressPropagation}
      >
        解放をシミュレート
      </button>
    </div>
  )}
</li>
 );
}

function buildPhotoDraft(
  customEntries: CustomPhotoEntry[],
  defaultPhotos: TripPhoto[],
): PhotoDraft[] {
  const drafts: PhotoDraft[] = [];
  for (let index = 0; index < MAX_CUSTOM_PHOTOS; index += 1) {
    const custom = customEntries[index];
    if (custom && custom.src) {
      drafts.push({
        src: custom.src,
        caption: custom.caption ?? "",
      });
      continue;
    }
    const fallback = defaultPhotos[index];
    drafts.push({
      src: fallback?.src ?? "",
      caption: fallback?.caption ?? "",
    });
  }
  return drafts;
}

interface SpotDetailProps {
  spot: TripSpot;
  unlocked: boolean;
  unlocking: boolean;
  distance: number | null;
  arrivalAwarded: boolean;
  onMissionComplete: (mission: TripMission) => void;
  completedMissionIds: Set<string>;
  defaultMessage: string;
  defaultPhotos: TripPhoto[];
  customMessage?: string;
  customPhotos: CustomPhotoEntry[];
  onSaveContent: (payload: SpotContentPayload) => void;
  onResetContent: () => void;
}

function SpotDetail({
  spot,
  unlocked,
  unlocking,
  distance,
  arrivalAwarded,
  onMissionComplete,
  completedMissionIds,
  defaultMessage,
  defaultPhotos,
  customMessage,
  customPhotos,
  onSaveContent,
  onResetContent,
}: SpotDetailProps) {
  const badgeClass = `spot-detail__badge${
    unlocking ? " spot-detail__badge--unlocking" : ""
  }${unlocked ? " spot-detail__badge--open" : ""}`;
  const allMissionsComplete =
    spot.missions.length === 0 ||
    spot.missions.every((mission) => completedMissionIds.has(mission.id));
  const canReveal = unlocked && allMissionsComplete;
  const [isEditing, setIsEditing] = useState(false);
  const [draftMessage, setDraftMessage] = useState<string>(
    customMessage ?? "",
  );
  const [draftPhotos, setDraftPhotos] = useState<PhotoDraft[]>(() =>
    buildPhotoDraft(customPhotos, defaultPhotos),
  );
  const suppressPropagation = useCallback(suppressEventPropagation, []);

  useEffect(() => {
    if (!isEditing) {
      setDraftMessage(customMessage ?? "");
      setDraftPhotos(buildPhotoDraft(customPhotos, defaultPhotos));
    }
  }, [customMessage, customPhotos, defaultPhotos, isEditing, spot.id]);

  const handleEditorOpen = useCallback(() => {
    setIsEditing(true);
    setDraftMessage(customMessage ?? "");
    setDraftPhotos(buildPhotoDraft(customPhotos, defaultPhotos));
  }, [customMessage, customPhotos, defaultPhotos]);

  const handleEditorCancel = useCallback(() => {
    setIsEditing(false);
    setDraftMessage(customMessage ?? "");
    setDraftPhotos(buildPhotoDraft(customPhotos, defaultPhotos));
  }, [customMessage, customPhotos, defaultPhotos]);

  const handleEditorReset = useCallback(() => {
    onResetContent();
    setIsEditing(false);
    setDraftMessage("");
    setDraftPhotos(buildPhotoDraft([], defaultPhotos));
  }, [defaultPhotos, onResetContent]);

  const handleEditorSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = draftMessage.trim();
      const cleanedPhotos = draftPhotos
        .map(({ src, caption }) => {
          const photoSrc = src.trim();
          const photoCaption = caption.trim();
          if (!photoSrc) {
            return null;
          }
          return photoCaption ? { src: photoSrc, caption: photoCaption } : { src: photoSrc };
        })
        .filter((entry): entry is CustomPhotoEntry => Boolean(entry))
        .slice(0, MAX_CUSTOM_PHOTOS);
      onSaveContent({ message: trimmed, photos: cleanedPhotos });
      setIsEditing(false);
    },
    [draftMessage, draftPhotos, onSaveContent],
  );

  const inCustomState =
    !!customMessage?.trim() || customPhotos.length > 0;

  return (
    <article
      className={`spot-detail${unlocked ? " spot-detail--unlocked" : ""}`}
      aria-live="polite"
      onMouseDown={suppressPropagation}
      onPointerDown={suppressPropagation}
      onTouchStart={suppressPropagation}
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
                        onMouseDown={suppressPropagation}
                        onPointerDown={suppressPropagation}
                        onTouchStart={suppressPropagation}
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
                <div className="spot-detail__message-header">
                  <h4>手紙メッセージ</h4>
                  <button
                    type="button"
                    className="spot-detail__edit-button"
                    onClick={isEditing ? handleEditorCancel : handleEditorOpen}
                    aria-expanded={isEditing}
                  >
                    {isEditing ? "編集を閉じる" : "カスタマイズ"}
                  </button>
                </div>
                {inCustomState && !isEditing && (
                  <p className="spot-detail__message-hint">
                    カスタム入力が適用されています
                  </p>
                )}
                <p>{spot.memory.message}</p>
              </div>
              {isEditing && (
                <form
                  className="spot-detail__editor"
                  onSubmit={handleEditorSubmit}
                >
                  <label className="spot-detail__editor-field">
                    <span>メッセージ</span>
                    <textarea
                      value={draftMessage}
                      onChange={(event) => setDraftMessage(event.target.value)}
                      placeholder={defaultMessage}
                      rows={4}
                    />
                  </label>
                  <div className="spot-detail__editor-photos">
                    {draftPhotos.map((draft, index) => (
                      <div
                        key={`photo-input-${index}`}
                        className="spot-detail__editor-photo-group"
                      >
                        <label className="spot-detail__editor-field">
                          <span>写真 {index + 1} のURL</span>
                          <input
                            type="url"
                            value={draft.src}
                            onChange={(event) => {
                              setDraftPhotos((prev) => {
                                const next = [...prev];
                                next[index] = {
                                  ...next[index],
                                  src: event.target.value,
                                };
                                return next;
                              });
                            }}
                            placeholder={
                              defaultPhotos[index]?.src ?? "/memories/..."
                            }
                            inputMode="url"
                            pattern="https?://.*|/.*"
                          />
                        </label>
                        <label className="spot-detail__editor-field spot-detail__editor-caption">
                          <span>キャプション</span>
                          <input
                            type="text"
                            value={draft.caption}
                            onChange={(event) => {
                              setDraftPhotos((prev) => {
                                const next = [...prev];
                                next[index] = {
                                  ...next[index],
                                  caption: event.target.value,
                                };
                                return next;
                              });
                            }}
                            placeholder={
                              defaultPhotos[index]?.caption ??
                              "（空欄で非表示）"
                            }
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                  <div className="spot-detail__editor-actions">
                    <button type="submit" className="spot-detail__editor-save">
                      保存する
                    </button>
                    <button
                      type="button"
                      onClick={handleEditorCancel}
                      className="spot-detail__editor-cancel"
                    >
                      キャンセル
                    </button>
                    <button
                      type="button"
                      onClick={handleEditorReset}
                      className="spot-detail__editor-reset"
                    >
                      デフォルトに戻す
                    </button>
                  </div>
                </form>
              )}
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
