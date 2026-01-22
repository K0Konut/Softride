export const env = {
  MAPBOX_TOKEN: import.meta.env.VITE_MAPBOX_TOKEN as string | undefined,

  EMAILJS_PUBLIC_KEY: import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined,
  EMAILJS_SERVICE_ID: import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined,
  EMAILJS_TEMPLATE_ID: import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined,
  EMAILJS_SUBJECT: import.meta.env.VITE_EMAILJS_SUBJECT as string | undefined,
};

export function requireMapboxToken(): string {
  const token = env.MAPBOX_TOKEN?.trim();
  if (!token) throw new Error("VITE_MAPBOX_TOKEN manquant (.env).");
  return token;
}

export function requireEmailJsConfig() {
  const publicKey = env.EMAILJS_PUBLIC_KEY?.trim();
  const serviceId = env.EMAILJS_SERVICE_ID?.trim();
  const templateId = env.EMAILJS_TEMPLATE_ID?.trim();

  if (!publicKey) throw new Error("VITE_EMAILJS_PUBLIC_KEY manquant (.env).");
  if (!serviceId) throw new Error("VITE_EMAILJS_SERVICE_ID manquant (.env).");
  if (!templateId) throw new Error("VITE_EMAILJS_TEMPLATE_ID manquant (.env).");

  return { publicKey, serviceId, templateId };
}
