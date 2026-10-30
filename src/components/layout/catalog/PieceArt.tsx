import type { ReactElement } from 'react';

const WOOD = '#c89b64';
const WOOD_DARK = '#9c7343';
const WOOD_TOP = '#ddb887';

// Flat inline drawings of the three loose carpentry pieces (no rendered capture exists for them)
export function PieceArt({ id }: { id: string }): ReactElement | null {
  const svg = (children: ReactElement) => (
    <svg viewBox="0 0 64 64" className="h-full w-full p-2" aria-hidden="true">
      {children}
    </svg>
  );
  if (id === 'board-horizontal') {
    return svg(
      <>
        <polygon points="6,34 40,34 58,24 24,24" fill={WOOD_TOP} stroke={WOOD_DARK} strokeWidth="1" />
        <polygon points="6,34 40,34 40,40 6,40" fill={WOOD} stroke={WOOD_DARK} strokeWidth="1" />
        <polygon points="40,34 58,24 58,30 40,40" fill={WOOD_DARK} stroke={WOOD_DARK} strokeWidth="1" />
      </>,
    );
  }
  if (id === 'board-vertical') {
    return svg(
      <>
        <polygon points="20,8 40,8 40,56 20,56" fill={WOOD} stroke={WOOD_DARK} strokeWidth="1" />
        <polygon points="40,8 46,5 46,53 40,56" fill={WOOD_DARK} stroke={WOOD_DARK} strokeWidth="1" />
        <polygon points="20,8 40,8 46,5 26,5" fill={WOOD_TOP} stroke={WOOD_DARK} strokeWidth="1" />
      </>,
    );
  }
  if (id === 'wood-slat') {
    return svg(
      <>
        <polygon points="6,38 48,38 48,46 6,46" fill={WOOD} stroke={WOOD_DARK} strokeWidth="1" />
        <polygon points="6,38 48,38 58,31 16,31" fill={WOOD_TOP} stroke={WOOD_DARK} strokeWidth="1" />
        <polygon points="48,38 58,31 58,39 48,46" fill={WOOD_DARK} stroke={WOOD_DARK} strokeWidth="1" />
      </>,
    );
  }
  return null;
}
