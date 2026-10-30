import { AppLayout } from './components/layout/AppLayout';
import { ThumbnailStage, THUMBNAIL_PARAM } from './components/layout/thumbnail/ThumbnailStage';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

// `?thumbnail=<catalogId>` renders a single prop for scripts/capture-thumbnails.mjs
export const thumbnailSubject = (): string | null => new URLSearchParams(window.location.search).get(THUMBNAIL_PARAM);

function Editor() {
  useKeyboardShortcuts();
  return <AppLayout />;
}

export default function App() {
  const subject = thumbnailSubject();
  return subject ? <ThumbnailStage subject={subject} /> : <Editor />;
}
