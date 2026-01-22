import emailjs from "@emailjs/browser";
import type { LatLng } from "../../types/routing";
import type { EmergencyContact } from "./contact";
import { env, requireEmailJsConfig } from "../../app/config/env";

function formatLocation(loc?: LatLng | null) {
  if (!loc) return { line: "", mapsUrl: "" };
  const mapsUrl = `https://maps.google.com/?q=${loc.lat},${loc.lng}`;
  const line = `\n\n📍 Position: ${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}\n🗺️ ${mapsUrl}`;
  return { line, mapsUrl };
}

export async function sendEmergencyEmail(params: {
  contact: EmergencyContact;
  currentLocation?: LatLng | null;
  isTest?: boolean;
}) {
  const { contact, currentLocation, isTest } = params;

  const { publicKey, serviceId, templateId } = requireEmailJsConfig();
  const timestamp = new Date().toISOString();
  const subject = env.EMAILJS_SUBJECT?.trim() || "🚨 SoftRide — Alerte";

  const loc = formatLocation(currentLocation);
  const body = `${contact.message}${loc.line}${isTest ? "\n\n✅ Test SoftRide : ceci est un message de test." : ""}`;

  const templateParams = {
    to_email: contact.email,
    subject,
    message: body,
    timestamp,

    // optionnels mais utiles dans le template
    maps_url: loc.mapsUrl || "",
    lat: currentLocation ? currentLocation.lat.toFixed(6) : "",
    lng: currentLocation ? currentLocation.lng.toFixed(6) : "",
    app_name: "SoftRide",
  };

  // Selon les versions, le 4e param accepte string OU { publicKey }
  await emailjs.send(serviceId, templateId, templateParams, { publicKey });
}
