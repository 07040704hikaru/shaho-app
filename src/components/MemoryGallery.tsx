"use client";

import Image from "next/image";
import { useState } from "react";
import { TripPhoto } from "@/data/tripPlan";

interface MemoryGalleryProps {
  photos: TripPhoto[];
}

const FALLBACK_IMAGE_SRC = "/memories/cover.svg";
const FALLBACK_ALT = "思い出写真が読み込めませんでした";

export function MemoryGallery({ photos }: MemoryGalleryProps) {
  const [fallbackMap, setFallbackMap] = useState<Record<string, boolean>>({});

  if (!photos.length) {
    return null;
  }

  return (
    <div className="memory-gallery">
      {photos.map((photo) => (
        <figure key={photo.id} className="memory-gallery__item">
          <div className="memory-gallery__frame">
            <Image
              src={fallbackMap[photo.id] ? FALLBACK_IMAGE_SRC : photo.src}
              alt={fallbackMap[photo.id] ? FALLBACK_ALT : photo.alt}
              width={640}
              height={480}
              loading="lazy"
              className="memory-gallery__image"
              onError={() =>
                setFallbackMap((prev) =>
                  prev[photo.id] ? prev : { ...prev, [photo.id]: true },
                )
              }
              sizes="(max-width: 768px) 100vw, 33vw"
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
