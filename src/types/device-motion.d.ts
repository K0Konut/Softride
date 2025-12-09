export {};

declare global {
  interface DeviceMotionEventConstructor {
    requestPermission?: () => Promise<"granted" | "denied">;
  }

  // iOS Safari expose DeviceMotionEvent global
  // eslint-disable-next-line no-var
  var DeviceMotionEvent: DeviceMotionEventConstructor;
}
