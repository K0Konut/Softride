import { registerPlugin } from "@capacitor/core";

type FallServicePlugin = {
  start(): Promise<void>;
  stop(): Promise<void>;
};

export const FallService = registerPlugin<FallServicePlugin>("FallService");
