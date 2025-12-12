import type { LatLng } from "../../types/routing";
import type { EmergencyContact } from "./contact";
import type { EmergencyAlertPayload } from "../../types/emergency";

function encode(s: string) {
  return encodeURIComponent(s);
}

// iOS/Android varient légèrement sur ?body= / &body=, on gère les 2.
function buildSmsUrl(phone: string, body: string) {
  const p = phone.replace(/\s/g, "");
  const b = encode(body);

  // iOS accepte souvent sms:number&body= (et Android sms:number?body=)
  // On choisit une forme compatible la plupart du temps :
  return `sms:${p}?body=${b}`;
}

export function formatLocationLine(loc?: LatLng | null) {
  if (!loc) return "";
  const maps = `https://maps.google.com/?q=${loc.lat},${loc.lng}`;
  return `\n📍 Position: ${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}\n🗺️ ${maps}`;
}

const EMERGENCY_API_URL = import.meta.env.VITE_EMERGENCY_API_URL;

/**
 * Envoie l’alerte :
 *  - à ton backend (pour SMS / mail auto)
 *  - ET ouvre l’app SMS avec le message pré-rempli (fallback manuel)
 */
export async function sendEmergencyAlert(params: {
  contact: EmergencyContact;
  currentLocation?: LatLng | null;
}) {
  const { contact, currentLocation } = params;

  const body = `${contact.message}${formatLocationLine(currentLocation)}`;

  // 1) Tentative d’envoi vers le backend
  if (EMERGENCY_API_URL) {
    try {
      const payload: EmergencyAlertPayload = {
        clientId: "softride-local", // TODO: remplacer plus tard par un vrai ID user/device
        triggeredAt: new Date().toISOString(),
        platform: "capacitor-app",
        location: currentLocation
          ? {
              coords: {
                lat: currentLocation.lat,
                lng: currentLocation.lng,
              },
              accuracyMeters: null,
            }
          : null,
      };

      await fetch(EMERGENCY_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }).catch((e) => {
        console.error("[Emergency] erreur réseau backend", e);
      });
    } catch (e) {
      console.error("[Emergency] échec envoi backend", e);
    }
  } else {
    console.warn(
      "[Emergency] VITE_EMERGENCY_API_URL non défini : aucune alerte backend n’est envoyée."
    );
  }

  // 2) Ouvre l’app SMS avec le message pré-rempli (fallback manuel)
  window.location.href = buildSmsUrl(contact.phone, body);
}
