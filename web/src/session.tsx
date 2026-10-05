import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from './api';
import { activerSon } from './son';
import type { Moi } from './types';

interface Session { moi: Moi | null; charge: boolean; rafraichir: () => Promise<void>; definir: (m: Moi | null) => void }
const Ctx = createContext<Session>(null!);

export function FournisseurSession({ children }: { children: ReactNode }) {
  const [moi, setMoi] = useState<Moi | null>(null);
  const [charge, setCharge] = useState(false);
  const definir = useCallback((m: Moi | null) => { setMoi(m); if (m) activerSon(m.son); }, []);
  const rafraichir = useCallback(async () => {
    try { definir(await api.get<Moi>('/moi')); } catch { definir(null); } finally { setCharge(true); }
  }, [definir]);
  useEffect(() => {
    void rafraichir();
    const f = () => definir(null);
    window.addEventListener('cyber:deconnecte', f);
    return () => window.removeEventListener('cyber:deconnecte', f);
  }, [rafraichir, definir]);
  return <Ctx.Provider value={{ moi, charge, rafraichir, definir }}>{children}</Ctx.Provider>;
}

export const useSession = () => useContext(Ctx);
