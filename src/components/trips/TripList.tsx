"use client";

import Link from "next/link";
import { useState } from "react";
import { LogoutButton } from "@/components/LogoutButton";
import type { TripDraft } from "@/server/trips/mutations";
import type { TripListItem } from "@/server/trips/queries";

type TripListProps = {
  trips: TripListItem[];
  onCreate: (draft: TripDraft) => Promise<void>;
};

export function TripList({ trips, onCreate }: TripListProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formValues, setFormValues] = useState<TripDraft>({
    title: "",
    slug: "",
    tripDates: "",
    baseLocation: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasTrips = trips.length > 0;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await onCreate(formValues);
      setFormValues({ title: "", slug: "", tripDates: "", baseLocation: "" });
      setIsCreateModalOpen(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "トリップの作成に失敗しました。",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <section className="trip-list">
        <div className="trip-list__header">
          <h1 className="trip-list__title">トリップ一覧</h1>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="trip-list__create-button"
          >
            トリップを作成
          </button>
          <LogoutButton />
        </div>

        {hasTrips ? (
          <ul className="trip-list__items">
            {trips.map((trip) => (
              <li key={trip.id} className="trip-list__item">
                <Link href={`/trips/${trip.slug}`} className="trip-list__link">
                  <h2 className="trip-list__item-title">{trip.title}</h2>
                  <p className="trip-list__item-dates">{trip.tripDates}</p>
                  <p className="trip-list__item-location">{trip.baseLocation}</p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="trip-list__empty-message">
            まだトリップがありません。上のボタンから追加しましょう。
          </p>
        )}
      </section>

      {isCreateModalOpen ? (
        <div className="trip-create-modal">
          <div className="trip-create-modal__content">
            <h2>新規トリップを作成</h2>
            <form onSubmit={handleSubmit}>
              <label>
                タイトル:
                <input
                  type="text"
                  name="title"
                  value={formValues.title}
                  onChange={(event) =>
                    setFormValues((prev) => ({ ...prev, title: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                スラッグ:
                <input
                  type="text"
                  name="slug"
                  value={formValues.slug}
                  onChange={(event) =>
                    setFormValues((prev) => ({ ...prev, slug: event.target.value }))
                  }
                />
              </label>
              <label>
                日程:
                <input
                  type="text"
                  name="tripDates"
                  value={formValues.tripDates}
                  onChange={(event) =>
                    setFormValues((prev) => ({ ...prev, tripDates: event.target.value }))
                  }
                />
              </label>
              <label>
                出発地:
                <input
                  type="text"
                  name="baseLocation"
                  value={formValues.baseLocation}
                  onChange={(event) =>
                    setFormValues((prev) => ({
                      ...prev,
                      baseLocation: event.target.value,
                    }))
                  }
                />
              </label>
              {errorMessage ? <p className="trip-create-modal__error">{errorMessage}</p> : null}
              <div className="trip-create-modal__actions">
                <button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "作成中..." : "作成"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isSubmitting}
                >
                  閉じる
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
