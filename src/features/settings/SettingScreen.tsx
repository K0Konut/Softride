import { useEffect, useMemo, useState } from "react";
import FallDetectionPanel from "../fall/FallDetectionPanel";
import FallDebugPanel from "../fall/FallDebugPanel";
import {
  loadEmergencyContact,
  saveEmergencyContact,
  clearEmergencyContact,
  type EmergencyContact,
} from "../../services/emergency/contact";
import { sendEmergencyEmail } from "../../services/emergency/email";
import { useLocationStore } from "../../store/location.slice";

const DEFAULT_MSG =
  "🚨 SoftRide: chute potentielle détectée. Si je ne réponds pas, peux-tu me contacter ?";

function looksLikeEmail(v: string) {
  const s = v.trim();
  return s.includes("@") && s.includes(".");
}

export default function SettingsScreen() {
  const fix = useLocationStore((s) => s.fix);

  const [contact, setContact] = useState<EmergencyContact>({
    email: "",
    message: DEFAULT_MSG,
  });
  const [status, setStatus] = useState<string | null>(null);

  const emailOk = useMemo(() => looksLikeEmail(contact.email), [contact.email]);

  useEffect(() => {
    (async () => {
      const saved = await loadEmergencyContact();
      if (saved) setContact(saved);
    })();
  }, []);

  async function handleSave() {
    setStatus(null);
    if (!looksLikeEmail(contact.email)) {
      setStatus("⚠️ Renseigne un email valide.");
      return;
    }
    await saveEmergencyContact({
      email: contact.email.trim(),
      message: contact.message?.trim() || DEFAULT_MSG,
    });
    setStatus("✅ Contact enregistré.");
  }

  async function handleClear() {
    await clearEmergencyContact();
    setContact({ email: "", message: DEFAULT_MSG });
    setStatus("✅ Contact supprimé.");
  }

  async function handleTestEmail() {
    setStatus(null);

    const email = contact.email.trim();
    if (!looksLikeEmail(email)) {
      setStatus("⚠️ Renseigne un email avant de tester.");
      return;
    }

    try {
      await sendEmergencyEmail({
        contact: { email, message: contact.message?.trim() || DEFAULT_MSG },
        currentLocation: fix ?? null,
        isTest: true,
      });

      setStatus("✅ Email envoyé (regarde aussi tes spams).");
    } catch (err: any) {
      console.error("EmailJS error:", err);

      // EmailJS renvoie souvent { status, text }
      const status = err?.status ? `status=${err.status}` : "";
      const text = err?.text ? `text=${err.text}` : (err?.message ?? "Erreur inconnue");

      setStatus(`❌ Email non envoyé. ${status} ${text}`.trim());
    }
  }

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-bold">Réglages</h1>
        <p className="text-sm text-zinc-400">Sécurité, capteurs et préférences.</p>
      </header>

      <FallDetectionPanel />
      <FallDebugPanel />

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
        <div className="text-sm font-semibold text-zinc-100">Contact d’urgence</div>

        <label className="block space-y-1">
          <span className="text-xs text-zinc-400">Email</span>
          <input
            value={contact.email}
            onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
            placeholder="contact@domaine.com"
            className="w-full rounded-xl border border-zinc-800 bg-black/30 px-3 py-2 text-sm outline-none focus:border-sky-500/60"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-zinc-400">Message</span>
          <textarea
            value={contact.message}
            onChange={(e) => setContact((c) => ({ ...c, message: e.target.value }))}
            rows={3}
            className="w-full rounded-xl border border-zinc-800 bg-black/30 px-3 py-2 text-sm outline-none focus:border-sky-500/60"
          />
        </label>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm hover:bg-zinc-800"
          >
            Enregistrer
          </button>

          <button
            onClick={handleClear}
            className="rounded-xl border border-zinc-800 bg-transparent px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900"
          >
            Supprimer
          </button>
        </div>

        <button
          onClick={handleTestEmail}
          disabled={!emailOk}
          className="w-full rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sm text-sky-200 hover:bg-sky-500/15 disabled:opacity-50"
        >
          Tester l’alerte Email
        </button>

        {status && <div className="text-xs text-zinc-300">{status}</div>}

        <p className="text-xs text-zinc-500">
          L’alerte envoie un email automatique avec un message + ta position (si dispo).
        </p>

        <div className="text-[11px] text-zinc-500">
          Position actuelle :{" "}
          <span className="text-zinc-300">
            {fix ? `${fix.lat.toFixed(5)}, ${fix.lng.toFixed(5)}` : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
