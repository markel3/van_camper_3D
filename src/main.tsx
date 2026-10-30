import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App, { thumbnailSubject } from './App';
import { restoreAutosave, startAutosave } from './store/autosave';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('No se ha encontrado el elemento #root en index.html');
}

// Recover the last session before the first render, then keep saving changes in the background.
// Thumbnail capture renders a clean scene and must never touch the user's autosave.
if (!thumbnailSubject()) {
  restoreAutosave();
  startAutosave();
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
