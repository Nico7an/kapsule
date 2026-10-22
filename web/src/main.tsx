import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/jetbrains-mono';
import './styles.css';
import { FournisseurSession, useSession } from './session';
import { Chargement, Toasts } from './composants/Divers';
import { Coquille } from './composants/Coquille';
import { Connexion, Creer, Rejoindre } from './pages/Auth';
import { Apprendre } from './pages/Apprendre';
import { Lecon } from './pages/Lecon';
import { Classement } from './pages/Classement';
import { Profil } from './pages/Profil';
import { Tableau } from './pages/admin/Tableau';
import { Membres, FicheMembre } from './pages/admin/Membres';
import { Defis, EditeurDefi } from './pages/admin/Defis';
import { Organisation } from './pages/admin/Organisation';

function Routeur() {
  const { moi, charge } = useSession();
  if (!charge) return <Chargement />;
  if (!moi) {
    return (
      <Routes>
        <Route path="/rejoindre/:code" element={<Rejoindre />} />
        <Route path="/creer" element={<Creer />} />
        <Route path="*" element={<Connexion />} />
      </Routes>
    );
  }
  return (
    <Routes>
      <Route path="/lecon/:id" element={<Lecon />} />
      <Route element={<Coquille />}>
        <Route path="/" element={<Apprendre />} />
        <Route path="/classement" element={<Classement />} />
        <Route path="/profil" element={<Profil />} />
        {moi.role === 'admin' && (
          <>
            <Route path="/admin" element={<Tableau />} />
            <Route path="/admin/membres" element={<Membres />} />
            <Route path="/admin/membres/:id" element={<FicheMembre />} />
            <Route path="/admin/defis" element={<Defis />} />
            <Route path="/admin/defis/:id" element={<EditeurDefi />} />
            <Route path="/admin/organisation" element={<Organisation />} />
          </>
        )}
      </Route>
      {/* Juste après la création d'une organisation : direction l'invitation de l'équipe. */}
      <Route path="/creer" element={<Navigate to={moi.role === 'admin' ? '/admin/membres' : '/'} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

createRoot(document.getElementById('racine')!).render(
  <StrictMode>
    <FournisseurSession>
      <BrowserRouter>
        <Routeur />
      </BrowserRouter>
      <Toasts />
    </FournisseurSession>
  </StrictMode>,
);
