import type { LatLng } from "../../types/routing";
import type { EmergencyContact } from "./contact";

function smsUrl(phone: string, body: string) {
  const p = phone.replace(/\s/g, "");
  const b = encodeURIComponent(body);

  // Android: sms:number?body=...
  // iOS accepte souvent aussi sms:number?body=...
  return `sms:${p}?body=${b}`;
}

function locationBlock(loc?: LatLng | null) {
  if (!loc) return "";
  const maps = `https://maps.google.com/?q=${loc.lat},${loc.lng}`;
  return `\n\n📍 Position: ${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}\n🗺️ ${maps}`;
}

export async function openEmergencySms(params: {
  contact: EmergencyContact;
  currentLocation?: LatLng | null;
}) {
  const { contact, currentLocation } = params;

  const body = `${contact.message}${locationBlock(currentLocation)}`;
  window.location.href = smsUrl(contact.phone, body);
}
