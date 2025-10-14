"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef } from "react";
import { TripSpot } from "@/data/tripPlan";
import { Circle, MapContainer, Marker, TileLayer, Tooltip } from "react-leaflet";
import type { LatLngBoundsExpression, DivIcon } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { resolveSpotIcon } from "@/data/spotIcons";

interface TripMapProps {
  spots: TripSpot[];
  activeSpotId: string;
  unlockedSpotIds: Set<string>;
  recentlyUnlocked: Set<string>;
  onSelect: (spotId: string) => void;
  customLabels: Record<string, string>;
  onLabelChange: (spotId: string, label: string | null) => void;
}

type LatLngTuple = [number, number];

function createMarkerIcon(
  label: string,
  iconUrl: string | undefined,
  {
    unlocked,
    active,
    unlocking,
  }: { unlocked: boolean; active: boolean; unlocking: boolean },
): DivIcon {
  const classes = [
    "trip-map__marker",
    unlocked && "trip-map__marker--unlocked",
    active && "trip-map__marker--active",
    unlocking && "trip-map__marker--recent",
  ]
    .filter(Boolean)
    .join(" ");

  const safeLabel = label.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char] ?? char;
  });
  const display = safeLabel.trim() || "★";
  const markerHtml = iconUrl
    ? `<img src="${iconUrl}" alt="${display}" />`
    : `<span>${display}</span>`;

  return L.divIcon({
    className: classes,
    html: markerHtml,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -36],
  });
}

export function TripMap({
  spots,
  activeSpotId,
  unlockedSpotIds,
  recentlyUnlocked,
  onSelect,
  customLabels,
  onLabelChange,
}: TripMapProps) {
  const positions = useMemo<LatLngTuple[]>(() => {
    return spots.map(
      (spot) => [spot.coordinates.lat, spot.coordinates.lng] as LatLngTuple,
    );
  }, [spots]);

  const bounds = useMemo<LatLngBoundsExpression | undefined>(() => {
    if (!positions.length) {
      return undefined;
    }

    const computed = L.latLngBounds(positions);
    // Padding adds breathing room around the route.
    return computed.isValid() ? computed.pad(0.18) : undefined;
  }, [positions]);

  const initialCenter: LatLngTuple = positions[0] ?? [35.681298, 139.766247];
  const markerLongPressRef = useRef<number | null>(null);
  const markerTriggeredRef = useRef(false);

  const resolveLabel = useCallback(
    (spot: TripSpot) => {
      const custom = customLabels[spot.id];
      if (custom && custom.trim()) {
        return custom.trim().slice(0, 3);
      }
      const defaultChar = spot.name.trim().charAt(0);
      return defaultChar || "★";
    },
    [customLabels],
  );

  const openLabelPrompt = useCallback(
    (spot: TripSpot) => {
      markerTriggeredRef.current = true;
      if (markerLongPressRef.current) {
        window.clearTimeout(markerLongPressRef.current);
        markerLongPressRef.current = null;
      }
      const current = customLabels[spot.id] ?? resolveLabel(spot);
      const next = window.prompt(
        `${spot.name} のマップラベルを入力（最大3文字）`,
        current,
      );
      if (next === null) {
        return;
      }
      const trimmed = next.trim();
      if (!trimmed) {
        onLabelChange(spot.id, null);
        return;
      }
      onLabelChange(spot.id, trimmed.slice(0, 3));
    },
    [customLabels, onLabelChange, resolveLabel],
  );

  const startMarkerLongPress = useCallback(
    (spot: TripSpot) => {
      if (markerLongPressRef.current) {
        window.clearTimeout(markerLongPressRef.current);
      }
      markerTriggeredRef.current = false;
      markerLongPressRef.current = window.setTimeout(() => {
        openLabelPrompt(spot);
      }, 650);
    },
    [openLabelPrompt],
  );

  const cancelMarkerLongPress = useCallback(() => {
    if (markerLongPressRef.current) {
      window.clearTimeout(markerLongPressRef.current);
      markerLongPressRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (markerLongPressRef.current) {
        window.clearTimeout(markerLongPressRef.current);
      }
    };
  }, []);

  return (
    <div className="trip-map">
      <div className="trip-map__canvas">
        <MapContainer
          className="trip-map__leaflet"
          center={initialCenter}
          zoom={12}
          scrollWheelZoom
          dragging
          touchZoom
          inertia
          zoomSnap={0.25}
          zoomDelta={0.5}
          bounds={bounds}
          style={{ width: "100%", height: "100%" }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />

          {spots.map((spot) => {
            const unlocked = unlockedSpotIds.has(spot.id);
            const active = activeSpotId === spot.id;
            const unlocking = recentlyUnlocked.has(spot.id);
            const position: LatLngTuple = [
              spot.coordinates.lat,
              spot.coordinates.lng,
            ];
            const markerLabel = resolveLabel(spot);
            const iconPath =
              customLabels[spot.id]?.trim() ?
                undefined
              : resolveSpotIcon(spot.name);

            return (
              <Fragment key={spot.id}>
                <Circle
                  center={position}
                  radius={Math.max(spot.unlockRadiusMeters, 50)}
                  pathOptions={{
                    color: unlocked ? "#566fff" : "#9aa7ff",
                    fillColor: unlocked ? "#566fff" : "#94a3ff",
                    fillOpacity: unlocked ? 0.16 : 0.08,
                    weight: unlocked ? 1.4 : 1,
                    dashArray: unlocked ? undefined : "6 12",
                  }}
                  eventHandlers={{
                    click: () => onSelect(spot.id),
                  }}
                />
                <Marker
                  position={position}
                  icon={createMarkerIcon(markerLabel, iconPath, {
                    unlocked,
                    active,
                    unlocking,
                  })}
                  eventHandlers={{
                    click: () => {
                      cancelMarkerLongPress();
                      if (!markerTriggeredRef.current) {
                        onSelect(spot.id);
                      } else {
                        markerTriggeredRef.current = false;
                      }
                    },
                    mousedown: () => startMarkerLongPress(spot),
                    mouseup: () => cancelMarkerLongPress(),
                    mouseout: () => cancelMarkerLongPress(),
                    contextmenu: (event) => {
                      event.originalEvent.preventDefault();
                      openLabelPrompt(spot);
                    },
                  }}
                  zIndexOffset={active ? 1000 : unlocked ? 500 : 200}
                >
                  <Tooltip direction="top" offset={[0, -24]} opacity={1}>
                    <div className="trip-map__tooltip">
                      <strong>{spot.name}</strong>
                      <span>{spot.location}</span>
                    </div>
                  </Tooltip>
                </Marker>
              </Fragment>
            );
          })}
        </MapContainer>
      </div>

      <div className="trip-map__legend">
        <div className="trip-map__legend-item">
          <span className="trip-map__legend-dot trip-map__legend-dot--ready" />
          <div>
            <p>ロック解除済み</p>
            <span>ピンが青色に光ります</span>
          </div>
        </div>
        <div className="trip-map__legend-item">
          <span className="trip-map__legend-dot trip-map__legend-dot--locked" />
          <div>
            <p>まだ内緒</p>
            <span>エリアを訪れると開放されます</span>
          </div>
        </div>
      </div>
    </div>
  );
}
