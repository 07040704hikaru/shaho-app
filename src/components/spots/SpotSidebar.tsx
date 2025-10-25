"use client";

import { useEffect, useMemo, useState } from "react";
import { SpotForm, SpotFormValues, SpotSubmitPayload } from "@/components/spots/SpotForm";

type SidebarSpot = {
  id: string;
  name: string;
  description: string;
  location: string;
  date: string;
};

type SpotSidebarProps = {
  spots: SidebarSpot[];
  activeSpotId?: string;
  onSelectSpot?: (spotId: string) => void;
  onCreateSpot: (payload: SpotFormValues) => Promise<string> | string;
  onUpdateSpot: (spotId: string, payload: SpotFormValues) => Promise<void> | void;
  onDeleteSpot?: (spotId: string) => Promise<void> | void;
  editingSpotId?: string | null;
  onEditingChange?: (spotId: string | null) => void;
};

export function SpotSidebar({
  spots,
  activeSpotId,
  onSelectSpot,
  onCreateSpot,
  onUpdateSpot,
  onDeleteSpot,
  editingSpotId,
  onEditingChange,
}: SpotSidebarProps) {
  const isControlled = typeof onEditingChange === "function";
  const [internalEditingId, setInternalEditingId] = useState<string | null>(
    editingSpotId ?? null,
  );
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (isControlled) {
      return;
    }
    setInternalEditingId(editingSpotId ?? null);
  }, [editingSpotId, isControlled]);

  const currentEditingSpotId = isControlled
    ? editingSpotId ?? null
    : internalEditingId;

  const setEditingSpotId = (next: string | null) => {
    if (isControlled) {
      onEditingChange?.(next);
    } else {
      setInternalEditingId(next);
    }
  };

  const editingSpot = useMemo(
    () => spots.find((spot) => spot.id === currentEditingSpotId) ?? null,
    [spots, currentEditingSpotId],
  );

  const initialValues = useMemo(() => {
    if (!editingSpot) {
      return undefined;
    }

    const { name, description, location, date } = editingSpot;
    return { name, description, location, date };
  }, [editingSpot]);

  async function handleSubmit(payload: SpotSubmitPayload) {
    const submitValues: SpotFormValues = {
      name: payload.name,
      description: payload.description,
      location: payload.location,
      date: payload.date,
    };

    if (payload.id) {
      await onUpdateSpot(payload.id, submitValues);
      setEditingSpotId(null);
    } else {
      const createdId = await onCreateSpot(submitValues);
      const normalizedId = typeof createdId === "string" ? createdId : null;
      if (normalizedId) {
        onSelectSpot?.(normalizedId);
        setEditingSpotId(normalizedId);
      } else {
        setEditingSpotId(null);
      }
    }
  }

  async function handleDelete(spotId: string) {
    if (!onDeleteSpot) {
      return;
    }

    setPendingDeleteId(spotId);
    try {
      await onDeleteSpot(spotId);
      if (currentEditingSpotId === spotId) {
        setEditingSpotId(null);
      }
    } finally {
      setPendingDeleteId((current) => (current === spotId ? null : current));
    }
  }

  const isEditingMode = Boolean(currentEditingSpotId);

  return (
    <aside className="spot-sidebar">
      <div className="spot-sidebar__header">
        <h2 className="spot-sidebar__title">スポット管理</h2>
        <button
          type="button"
          className="spot-sidebar__create"
          onClick={() => setEditingSpotId(null)}
        >
          新規スポット
        </button>
      </div>

      <ul className="spot-sidebar__list">
        {spots.map((spot) => {
          const isActive = spot.id === activeSpotId;
          const isPendingDelete = pendingDeleteId === spot.id;

          return (
            <li key={spot.id} className="spot-sidebar__item">
              <button
                type="button"
                className={`spot-sidebar__spot ${isActive ? "is-active" : ""}`}
                onClick={() => onSelectSpot?.(spot.id)}
              >
                <span className="spot-sidebar__spot-name">{spot.name}</span>
                <span className="spot-sidebar__spot-meta">{spot.location}</span>
              </button>
              <div className="spot-sidebar__actions">
                <button
                  type="button"
                  className="spot-sidebar__action spot-sidebar__action--edit"
                  onClick={() => setEditingSpotId(spot.id)}
                >
                  編集
                </button>
                {onDeleteSpot ? (
                  <button
                    type="button"
                    className="spot-sidebar__action spot-sidebar__action--delete"
                    onClick={() => void handleDelete(spot.id)}
                    disabled={isPendingDelete}
                  >
                    {isPendingDelete ? "削除中..." : "削除"}
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="spot-sidebar__form">
        <SpotForm
          mode={isEditingMode ? "edit" : "create"}
          spotId={currentEditingSpotId ?? undefined}
          initialValues={initialValues}
          onSubmit={handleSubmit}
          onCancel={isEditingMode ? () => setEditingSpotId(null) : undefined}
        />
      </div>
    </aside>
  );
}
