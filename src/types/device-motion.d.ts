export {};

declare global {
  interface DeviceMotionEventConstructor {
    requestPermission?: () => Promise<"granted" | "denied">;
  }

  // iOS Safari expose DeviceMotionEvent global
  var DeviceMotionEvent: DeviceMotionEventConstructor;
}
