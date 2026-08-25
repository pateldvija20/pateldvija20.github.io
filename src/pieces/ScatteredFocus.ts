import { createContext, useContext } from "react";

/**
 * Lets an interactive piece ask the Scattered stage to pan it to the centre of
 * the viewport before it plays its own interaction — click a folder off in the
 * corner and it comes to you first, then opens.
 *
 * Resolves once the pan has settled (immediately if the piece is already
 * centred). Only Scattered provides this; in Organised the focused piece is
 * already locked to the centre, so the context is absent and pieces open
 * straight away.
 */
export type CenterOnPiece = (el: HTMLElement) => Promise<void>;

export const ScatteredFocusContext = createContext<CenterOnPiece | null>(null);

export function useCenterOnPiece(): CenterOnPiece | null {
  return useContext(ScatteredFocusContext);
}
