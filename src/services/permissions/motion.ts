export type MotionPermission = "granted" | "denied" | "not-required";

export async function requestMotionPermission(): Promise<MotionPermission> {
  try {
    // iOS Safari: DeviceMotionEvent.requestPermission() existe mais pas typé partout
    const DME = (globalThis as any).DeviceMotionEvent as
      | undefined
      | { requestPermission?: () => Promise<"granted" | "denied"> };

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
