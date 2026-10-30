import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { PieceArt } from './PieceArt';

// Rendered thumbnails live in public/thumbnails/<id>.webp, listed in manifest.json by
// scripts/capture-thumbnails.mjs. Reading the manifest first avoids a 404 per missing image.
const MANIFEST_URL = '/thumbnails/manifest.json';

let manifestPromise: Promise<ReadonlySet<string>> | null = null;

function loadManifest(): Promise<ReadonlySet<string>> {
  manifestPromise ??= fetch(MANIFEST_URL)
    .then((response) => (response.ok ? (response.json() as Promise<{ ids?: unknown }>) : { ids: [] }))
    .then((data) => new Set(Array.isArray(data.ids) ? data.ids.filter((id): id is string => typeof id === 'string') : []))
    .catch(() => new Set<string>());
  return manifestPromise;
}

function useHasThumbnail(id: string): boolean {
  const [available, setAvailable] = useState<ReadonlySet<string> | null>(null);
  useEffect(() => {
    let alive = true;
    void loadManifest().then((ids) => alive && setAvailable(ids));
    return () => {
      alive = false;
    };
  }, []);
  return available?.has(id) ?? false;
}

interface ThumbnailProps {
  id: string;
  alt: string;
  fallbackIcon: LucideIcon;
  className?: string;
}

// Product image on a light studio backdrop, or the module's icon when no capture exists yet
export function Thumbnail({ id, alt, fallbackIcon: Icon, className = '' }: ThumbnailProps) {
  const listed = useHasThumbnail(id);
  const [failed, setFailed] = useState(false);
  const showImage = listed && !failed;

  return (
    <div
      className={`flex items-center justify-center overflow-hidden rounded bg-[radial-gradient(circle_at_50%_40%,#e9edf2,#b7c0cc)] ${className}`}
    >
      {showImage ? (
        <img
          src={`/thumbnails/${id}.webp`}
          alt={alt}
          loading="lazy"
          draggable={false}
          onError={() => setFailed(true)}
          className="h-full w-full object-contain"
        />
      ) : (
        (PieceArt({ id }) ?? <Icon size={30} strokeWidth={1.4} className="text-slate-500" aria-hidden="true" />)
      )}
    </div>
  );
}
