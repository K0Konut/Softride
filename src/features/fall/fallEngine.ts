export type FallEngineConfig = {
  g: number;

  // thresholds
  freefallG: number;           // e.g. 0.6g
  impactG: number;             // e.g. 2.7g
  impactGyroDps: number;       // e.g. 180 deg/s

  // timing
  freefallWindowMs: number;    // time to consider freefall "recent" before impact
  stillnessWindowMs: number;   // time to validate stillness
  maxImpactToStillnessMs: number;

  // stillness definition
  stillAccelTolG: number;      // around 1g magnitude tolerance (gravity)
  stillGyroMaxDps: number;     // max gyro mag for stillness
};

export type FallEvent =
  | { type: "POSSIBLE_FALL"; confidence: number }
  | { type: "FALL_CONFIRMED"; confidence: number };

type Sample = {
  t: number;
  ax?: number; ay?: number; az?: number; // accel m/s^2 (no gravity)
  gx?: number; gy?: number; gz?: number; // accel incl gravity m/s^2
  rAlpha?: number; rBeta?: number; rGamma?: number; // deg/s
};

type State = "IDLE" | "FREEFALL" | "IMPACT" | "STILLNESS_CHECK";

function mag3(x = 0, y = 0, z = 0) {
  return Math.sqrt(x * x + y * y + z * z);
}

export class FallEngine {
  private cfg: FallEngineConfig;

  private state: State = "IDLE";
  private lastFreefallAt: number | null = null;
  private impactAt: number | null = null;

  private stillStartAt: number | null = null;

  constructor(cfg: Partial<FallEngineConfig> = {}) {
    this.cfg = {
      g: 9.80665,

      freefallG: 0.6,
      impactG: 2.7,
      impactGyroDps: 180,

      freefallWindowMs: 900,
      stillnessWindowMs: 3000,
      maxImpactToStillnessMs: 9000,

      stillAccelTolG: 0.12,
      stillGyroMaxDps: 18,

      ...cfg,
    };
  }

  reset() {
    this.state = "IDLE";
    this.lastFreefallAt = null;
    this.impactAt = null;
    this.stillStartAt = null;
  }

  push(s: Sample): FallEvent | null {
    const { g, freefallG, impactG, impactGyroDps } = this.cfg;

    // Use accelerationIncludingGravity magnitude as primary signal
    const gMag = mag3(s.gx, s.gy, s.gz) / g; // in "g"
    const gyroMag = mag3(s.rAlpha, s.rBeta, s.rGamma); // deg/s magnitude

    // 1) detect freefall
    if (gMag > 0 && gMag < freefallG) {
      this.lastFreefallAt = s.t;
      if (this.state === "IDLE") this.state = "FREEFALL";
    }

    // 2) detect impact
    const recentFreefall =
      this.lastFreefallAt != null && (s.t - this.lastFreefallAt) <= this.cfg.freefallWindowMs;

    const impact = gMag >= impactG && gyroMag >= impactGyroDps;

    if (impact) {
      this.impactAt = s.t;
      this.state = "IMPACT";

      // confidence: freefall + strong impact
      const confidence = Math.min(
        1,
        (recentFreefall ? 0.55 : 0.25) + Math.min(0.45, (gMag - impactG) * 0.18) + Math.min(0.20, gyroMag / 900)
      );

      return { type: "POSSIBLE_FALL", confidence };
    }

    // 3) stillness check after impact
    if (this.state === "IMPACT" && this.impactAt != null) {
      if (s.t - this.impactAt > this.cfg.maxImpactToStillnessMs) {
        this.reset();
        return null;
      }

      const isStill =
        Math.abs(gMag - 1) <= this.cfg.stillAccelTolG && gyroMag <= this.cfg.stillGyroMaxDps;

      if (isStill) {
        if (!this.stillStartAt) this.stillStartAt = s.t;
        this.state = "STILLNESS_CHECK";

        if (s.t - this.stillStartAt >= this.cfg.stillnessWindowMs) {
          const confidence = Math.min(1, (recentFreefall ? 0.7 : 0.45) + 0.3);
          this.reset();
          return { type: "FALL_CONFIRMED", confidence };
        }
      } else {
        // not still yet
        this.stillStartAt = null;
      }
    }

    return null;
  }
}
