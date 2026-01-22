import { Preferences } from "@capacitor/preferences";

export type EmergencyContact = {
  email: string;   // ex: contact@domaine.com
  message: string; // texte de base
};

const KEY_V2 = "softride.emergencyContact.v2";
const KEY_V1 = "softride.emergencyContact.v1"; // ancien (phone)

/**
 * v2 (email) > sinon tentative de "migration" légère depuis v1 :
 * - si v1 contient un champ phone qui ressemble à un email, on le copie en v2.
 * - sinon on retourne null.
 */
export async function loadEmergencyContact(): Promise<EmergencyContact | null> {
  // 1) v2
  const { value: v2 } = await Preferences.get({ key: KEY_V2 });
  if (v2) {
    try {
      const parsed = JSON.parse(v2) as EmergencyContact;
      if (!parsed?.email) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  // 2) fallback v1 (si jamais quelqu’un avait déjà mis un email dans le champ téléphone)
  const { value: v1 } = await Preferences.get({ key: KEY_V1 });
  if (!v1) return null;

  try {
    const parsed = JSON.parse(v1) as { phone?: string; message?: string };
    const maybe = (parsed.phone ?? "").trim();
    if (!maybe.includes("@")) return null;

    const migrated: EmergencyContact = {
      email: maybe,
      message: (parsed.message ?? "").trim(),
    };

    await saveEmergencyContact(migrated);
    return migrated;
  } catch {
    return null;
  }
}

export async function saveEmergencyContact(contact: EmergencyContact): Promise<void> {
  await Preferences.set({ key: KEY_V2, value: JSON.stringify(contact) });
}

export async function clearEmergencyContact(): Promise<void> {
  await Preferences.remove({ key: KEY_V2 });
}
