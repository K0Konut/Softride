export default function Home() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold">Accueil</h2>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <p className="text-red-500 font-semibold">tailwindcss fonctionne ✅</p>
        <p className="mt-2 text-sm text-zinc-300">
          Prochaine étape : écran “carte” + routing sécurisé (Mapbox) + préparation Fall Detection.
        </p>
      </div>
    </section>
  );
}
