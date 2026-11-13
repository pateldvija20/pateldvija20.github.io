/**
 * How far the camera has stepped back into the coffee corner: 0 on the
 * bookshelf, 1 framing the whole corner. CameraRig writes it every frame;
 * Lighting reads it to keep the window light on what's in view.
 */
export const framing = { t: 0, x: 0 };
