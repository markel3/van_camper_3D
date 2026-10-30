// Tunables of the first-person walkthrough (metres, seconds, radians)

// Eye height above the cargo floor (clamped below the ceiling on low-roof vans)
export const EYE_HEIGHT_M = 1.75;
export const CEILING_CLEARANCE_M = 0.12;
export const WALK_FOV_DEG = 75;
export const WALK_NEAR_M = 0.03;
export const WALK_FAR_M = 60;

export const WALK_SPEED_MPS = 1.3;
export const RUN_SPEED_MPS = 2.6;
// Exponential smoothing of the velocity (higher = snappier)
export const VELOCITY_RESPONSE = 12;

export const PLAYER_RADIUS_M = 0.2;
// Modules whose top is at or below this height are stepped over (the eye rises with them)
export const STEP_HEIGHT_M = 0.45;
// Modules starting above this height (overhead cabinets) are walked under
export const HEAD_CLEARANCE_M = 1.45;

export const MOUSE_SENSITIVITY = 0.0022;
export const MAX_PITCH_RAD = Math.PI / 2 - 0.05;

// [E] reach and how often the aim hint is refreshed
export const INTERACT_RANGE_M = 1.5;
export const AIM_REFRESH_MS = 100;
