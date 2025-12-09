import { Preferences } from "@capacitor/preferences";

export type EmergencyContact = {
  phone: string;   // ex: +33612345678
  message: string; // texte de base
};

const KEY = "softride.emergencyContact.v1";

export async function loadEmergencyContact(): Promise<EmergencyContact | null> {
  const { value } = await Preferences.get({ key: KEY });
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as EmergencyContact;
    if (!parsed?.phone) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveEmergencyContact(contact: EmergencyContact): Promise<void> {
  await Preferences.set({ key: KEY, value: JSON.stringify(contact) });
}

export async function clearEmergencyContact(): Promise<void> {
  await Preferences.remove({ key: KEY });
}
