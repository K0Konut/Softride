// src/types/emergency.ts

import type { LatLng } from "./routing";

export type EmergencyLocation = {
  coords: LatLng;
  accuracyMeters: number | null;
};

export type EmergencyAlertPayload = {
  // Identifiant côté backend (user / device)
  clientId: string;

  // Quand la chute a été confirmée
  triggeredAt: string;

  // Dernière localisation connue
  location: EmergencyLocation | null;

  // Infos optionnelles pour debug / stats
  platform?: string;
  appVersion?: string;
};
