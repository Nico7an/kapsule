// Effets sonores synthétisés à la volée (Web Audio) : rien à télécharger.
let ctx: AudioContext | null = null;
let actif = true;

export const activerSon = (v: boolean) => { actif = v; };

function note(freq: number, debut: number, duree: number, type: OscillatorType = 'triangle', volume = 0.18) {
  if (!ctx) return;
  const t = ctx.currentTime + debut;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(volume, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + duree + 0.05);
}

function jouer(f: () => void) {
  if (!actif) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    f();
  } catch { /* pas d'audio disponible */ }
}

export const sons = {
  juste: () => jouer(() => { note(784, 0, 0.12); note(1175, 0.08, 0.22); }),
  faux: () => jouer(() => { note(196, 0, 0.18, 'square', 0.08); note(147, 0.12, 0.28, 'square', 0.08); }),
  combo: () => jouer(() => { [988, 1319, 1568].forEach((f, i) => note(f, i * 0.06, 0.12, 'triangle', 0.12)); }),
  victoire: () => jouer(() => { [523, 659, 784, 1047, 1319].forEach((f, i) => note(f, i * 0.09, 0.25)); }),
  echec: () => jouer(() => { [392, 330, 262, 196].forEach((f, i) => note(f, i * 0.14, 0.3, 'sawtooth', 0.06)); }),
  badge: () => jouer(() => { [1568, 2093, 2637].forEach((f, i) => note(f, i * 0.07, 0.3, 'sine', 0.12)); }),
  clic: () => jouer(() => note(1200, 0, 0.04, 'square', 0.03)),
};
