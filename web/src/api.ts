export class ErreurApi extends Error {
  constructor(message: string, public statut: number) { super(message); }
}

async function appel<T>(methode: string, url: string, corps?: unknown): Promise<T> {
  const r = await fetch(`/api${url}`, {
    method: methode,
    credentials: 'same-origin',
    headers: {
      ...(corps !== undefined ? { 'Content-Type': 'application/json' } : {}),
      // Exigé par le serveur sur toute écriture (protection CSRF).
      ...(methode !== 'GET' ? { 'X-Cyber': '1' } : {}),
    },
    body: corps !== undefined ? JSON.stringify(corps) : undefined,
  });
  const texte = await r.text();
  const donnees = texte ? JSON.parse(texte) : null;
  if (!r.ok) {
    if (r.status === 401 && !url.startsWith('/auth/')) window.dispatchEvent(new Event('cyber:deconnecte'));
    throw new ErreurApi(donnees?.erreur ?? 'Erreur réseau', r.status);
  }
  return donnees as T;
}

export const api = {
  get: <T>(url: string) => appel<T>('GET', url),
  post: <T>(url: string, corps: unknown = {}) => appel<T>('POST', url, corps),
  patch: <T>(url: string, corps: unknown) => appel<T>('PATCH', url, corps),
  put: <T>(url: string, corps: unknown) => appel<T>('PUT', url, corps),
  del: <T>(url: string, corps: unknown = {}) => appel<T>('DELETE', url, corps),
};
