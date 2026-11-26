// Canyon Chase — tuning constants.
export const STEP = 1 / 60;
export const BASE_SPEED = 26; // world units per second at start
export const MAX_SPEED = 50; // top speed after many rings
export const SPEED_PER_RING = 1.4;
export const LIVES = 3;
export const RING_SCORE = 100;
export const NEAR_MISS_SCORE = 25;
export const RING_RADIUS = 6.5;
export const RING_SPACING = 95; // world units between rings along -z
export const CHUNK_LENGTH = 200; // world units per generated chunk
export const CHUNKS_AHEAD = 4; // chunks kept in front of the plane
export const CHUNKS_BEHIND = 1;
export const PLANE_MIN_Y = 3;
export const PLANE_MAX_Y = 58;
export const BEST_KEY = 'canyon-chase-best';
