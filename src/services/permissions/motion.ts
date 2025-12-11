export type MotionPermission = "granted" | "denied" | "not-required";

export async function requestMotionPermission(): Promise<MotionPermission> {
  try {
    // iOS Safari: DeviceMotionEvent.requestPermission() existe mais pas typé partout
    const g = globalThis as typeof globalThis & {
      DeviceMotionEvent?: DeviceMotionEventConstructor;
    };

    const DME = g.DeviceMotionEvent;

    if (DME?.requestPermission) {
      const res = await DME.requestPermission();
      return res === "granted" ? "granted" : "denied";
    }

    // Android / Desktop: pas de demande explicite
    return "not-required";
  } catch {
    return "denied";
  }
}
