/** Window events between the particle scene and the rest of the page (kept free of three.js). */

/** Fired when the section in view changes; detail is the chapter id. */
export const CHAPTER_EVENT = "chapterchange";

/** Fired when a demo panel takes over the background shape; detail is its scene key, or null to
 *  hand the shape back to the chapter. */
export const SCENE_FOCUS_EVENT = "scenefocus";
