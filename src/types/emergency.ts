// src/types/emergency.ts

import type { LatLng } from "./routing";

export type EmergencyLocation = {
  coords: LatLng;
  accuracyMeters: number | null;
};

export type EmergencyContactPayload = {
  phone: string;
  message: string;
};

export type EmergencyAlertPayload = {
  /** Identifiant de l’appareil / utilisateur (pour plus tard). */
  clientId: string;
  /** ISO string de la date de déclenchement. */
  triggeredAt: string;
  /** Plateforme d’origine (capacitor-app, web, etc.). */
  platform?: string;
  /** Version d’app (optionnelle). */
  appVersion?: string;
  /** Localisation approximative au moment de la chute. */
  location: EmergencyLocation | null;
  /** Contact d’urgence à prévenir. */
  contact: EmergencyContactPayload;
};
