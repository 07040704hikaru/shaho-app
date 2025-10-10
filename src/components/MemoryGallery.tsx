"use client";

import { TripPhoto } from "@/data/tripPlan";
import type { SyntheticEvent } from "react";

interface MemoryGalleryProps {
  photos: TripPhoto[];
}

const FALLBACK_IMAGE_SRC = "/memories/cover.svg";
const FALLBACK_ALT = "思い出写真が読み込めませんでした";

function handleImageError(event: SyntheticEvent<HTMLImageElement>) {
  const target = event.currentTarget;
  if (target.dataset.fallbackApplied === "true") {
    return;
  }
  target.dataset.fallbackApplied = "true";
  target.src = FALLBACK_IMAGE_SRC;
  target.alt = FALLBACK_ALT;
}

export function MemoryGallery({ photos }: MemoryGalleryProps) {
  if (!photos.length) {
    return null;
  }

  return (
    <div className="memory-gallery">
      {photos.map((photo) => (
        <figure key={photo.id} className="memory-gallery__item">
          <div className="memory-gallery__frame">
            <img
              src={photo.src}
              alt={photo.alt}
              loading="lazy"
              className="memory-gallery__image"
              onError={handleImageError}
            />
          </div>
          {photo.caption && (
            <figcaption className="memory-gallery__caption">
              {photo.caption}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}
