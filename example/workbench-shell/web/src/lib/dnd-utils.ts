export const CSS = {
  Translate: { toString: (t: { x: number; y: number } | null) => (t ? `translate3d(${t.x}px, ${t.y}px, 0)` : undefined) } as {
    toString: (t: { x: number; y: number } | null) => string | undefined;
  },
};
