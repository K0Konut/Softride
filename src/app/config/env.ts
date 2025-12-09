export const env = {
  MAPBOX_TOKEN: import.meta.env.VITE_MAPBOX_TOKEN as string | undefined,
};

export function requireMapboxToken(): string {
  const token = env.MAPBOX_TOKEN?.trim();
  if (!token) throw new Error("VITE_MAPBOX_TOKEN manquant (.env).");
  return token;
}
