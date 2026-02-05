# SoftRide - Documentation

## 1. Resume
SoftRide est une application de navigation velo (web + mobile) basee sur React, Vite, Capacitor et Mapbox. Elle propose un guidage avec rerouting, un score de securite des itineraires, et une detection de chute avec alerte email.

## 2. Stack et dependances
- Frontend: React + TypeScript + Vite
- Styling: Tailwind CSS
- Mobile: Capacitor (Android / iOS)
- Cartographie: Mapbox GL JS + Mapbox Directions + Geocoding
- Etat: Zustand
- Alertes: EmailJS (email d'urgence)

Scripts principaux (voir `package.json`) :
- `npm run dev` : serveur de dev Vite
- `npm run build` : build + typecheck
- `npm run preview` : preview du build
- `npm run cap:sync` : build puis sync Capacitor
- `npm run cap:open:android` : ouvre Android Studio
- `npm run cap:open:ios` : ouvre Xcode
- `npm run lint` : lint ESLint
- `npm run typecheck` : verification TypeScript

## 3. Configuration (.env)
Fichiers: `.env` et `.env.example`.

Variables requises:
- `VITE_MAPBOX_TOKEN` : token Mapbox (carto, routing, geocoding)

Variables pour l'alerte email (EmailJS):
- `VITE_EMAILJS_PUBLIC_KEY`
- `VITE_EMAILJS_SERVICE_ID`
- `VITE_EMAILJS_TEMPLATE_ID`
- `VITE_EMAILJS_SUBJECT` (optionnel)

## 3.1 Exemples de configuration API

Exemple `.env` minimal (map uniquement):
```bash
VITE_MAPBOX_TOKEN=pk.your_mapbox_token_here
```

Exemple `.env` complet (map + EmailJS):
```bash
VITE_MAPBOX_TOKEN=pk.your_mapbox_token_here
VITE_EMAILJS_PUBLIC_KEY=your_public_key
VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_TEMPLATE_ID=your_template_id
VITE_EMAILJS_SUBJECT=🚨 SoftRide — Alerte
```

Mapbox:
- `VITE_MAPBOX_TOKEN` doit avoir acces a Directions API + Geocoding API.
- Profil routing utilise: `mapbox/cycling`.

EmailJS:
Le template EmailJS doit accepter ces variables:
`to_email`, `subject`, `message`, `timestamp`, `maps_url`, `lat`, `lng`, `app_name`, `name`, `time`.

## 4. Architecture et structure

Structure principale:
- `src/app` : routing et layout global
- `src/features` : ecrans et composants fonctionnels
- `src/services` : appels API, permissions, logique metier
- `src/store` : etats Zustand
- `src/types` : types TypeScript

Routes (React Router Hash):
- `/` : accueil
- `/map` : ecran carte et navigation
- `/settings` : reglages, contact urgence, debug chute

Layout:
- `src/app/layout/AppShell.tsx` contient la navigation basse et l'Outlet.
- Le mode map (`/map`) desactive le scroll pour garder la carte pleine page.

## 5. Navigation et routing

Fichiers cles:
- `src/features/map/MapScreen.tsx`
- `src/features/map/MapView.tsx`
- `src/services/mapbox/directions.ts`
- `src/services/routing/scorer.ts`
- `src/services/routing/geo.ts`

Flux principal:
1. Permission et fix GPS via `ensureLocationPermission()` et `getCurrentPosition()`.
2. Recherche destination via `geocodeForward()` (Mapbox Geocoding).
3. Calcul d'itineraire via `getSecureRoute()` (Mapbox Directions, profil cycling).
4. Scoring des itineraires avec `scoreCandidates()` (virages + vitesse + distance + duree).
5. Affichage sur la carte (route selectionnee + alternatives).
6. Navigation active avec suivi GPS, distance restante, ETA, instructions.

Rerouting:
- Si l'utilisateur sort de l'itineraire, l'app detecte l'ecart et recalcule apres un cooldown.
- La precision GPS est prise en compte pour eviter les faux positifs.

Session de navigation:
- Persisted dans `localStorage` (TTL 45 min) via `src/services/navigation/persistence.ts`.
- Au redemarrage, l'app peut reprendre la navigation automatiquement.

## 6. Carte et camera
`src/features/map/MapView.tsx` :
- Initialisation Mapbox GL (style streets-v12).
- Marqueur utilisateur + destination.
- Camera fluide en navigation (followUser + bearing).
- FitBounds automatique quand une route est calculee (si followUser = false).

## 7. Detection de chute

Fichiers cles:
- `src/features/fall/useFallDetection.ts`
- `src/features/fall/fallEngine.ts`
- `src/features/fall/FallDetectionPanel.tsx`
- `src/features/fall/FallDebugPanel.tsx`

Principe:
- Lecture accel + gyro via Capacitor Motion.
- Algorithme: freefall -> impact -> immobilite.
- Si chute confirmee, demarre un countdown (configurable).
- A 0, envoie un email d'urgence (EmailJS).

Parametres configurables (UI debug):
- Countdown (s)
- Warmup (ms)
- Cooldown (ms)
- Min sample Hz

## 8. Contact et alerte d'urgence

- Contact stocke via Capacitor Preferences (`src/services/emergency/contact.ts`).
- Format email + message personnalise.
- Envoi d'email via EmailJS (`src/services/emergency/email.ts`).
- L'email peut inclure la position GPS et un lien Google Maps.

## 9. Permissions

Localisation:
- `src/services/permissions/location.ts`
- `ensureLocationPermission()`, `getCurrentPosition()`, `watchPosition()`.

Capteurs:
- `src/services/permissions/motion.ts`
- iOS: demande explicite (DeviceMotionEvent.requestPermission).
- Android/Desktop: pas de demande explicite.

Notifications:
- Demande via `@capacitor/local-notifications` au demarrage de la carte.

## 10. Stores (Zustand)

- `src/store/location.slice.ts`: permission + fix GPS
- `src/store/routing.slice.ts`: routing (candidates, selection, loading)
- `src/store/navigation.slice.ts`: etat de navigation live
- `src/store/fall.slice.ts`: etat de detection de chute

## 11. Tests et qualite
Il n'y a pas de tests automatises inclus pour le moment. Les scripts disponibles:
- `npm run lint`
- `npm run typecheck`

## 12. Lancer sur mobile (Capacitor)
1. `npm install`
2. `npm run build`
3. `npm run cap:sync`
4. `npm run cap:open:android` ou `npm run cap:open:ios`

Capacitor config: `capacitor.config.ts` (appId `com.softride.app`).

## 12.1 APK via GitHub Releases

Un workflow GitHub Actions genere un APK debug et cree une Release quand un tag `test-v*` est pousse.

Exemple:
- `git tag test-v1.0.0`
- `git push origin test-v1.0.0`

Ensuite, l APK est telechargeable depuis la Release correspondante sur GitHub.

## 13. Depannage rapide

- Carte vide: verifie `VITE_MAPBOX_TOKEN`.
- Geocoding sans resultats: token Mapbox ou quota.
- Email d'urgence ne part pas: verifie les variables EmailJS.
- Capteurs indisponibles: tester sur mobile et verifier permissions.
- GPS imprecis: l'app affiche une pastille de qualite GPS.

## 14. Roadmap courte (optionnel)
- Ajout tests unitaires (routing, fall engine)
- Historique des trajets
- Mode offline partiel
- Notifications push natives
