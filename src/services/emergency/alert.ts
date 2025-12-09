import type { LatLng } from "../../types/routing";
import type { EmergencyContact } from "./contact";

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

export async function sendEmergencyAlert(params: {
  contact: EmergencyContact;
  currentLocation?: LatLng | null;
}) {
  const { contact, currentLocation } = params;

  const body = `${contact.message}${formatLocationLine(currentLocation)}`;

  // Capacitor: un simple changement d’URL ouvre l’app SMS sur mobile
  // (en web desktop ça ne marche pas toujours, mais sur mobile oui).
  window.location.href = buildSmsUrl(contact.phone, body);
}
