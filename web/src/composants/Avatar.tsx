const EMOJIS: Record<string, [string, string]> = {
  renard: ['🦊', '#FFB86B'], chat: ['🐱', '#FFE08A'], hibou: ['🦉', '#C9B48F'], panda: ['🐼', '#E8E2D1'],
  crabe: ['🦀', '#FFA08C'], pieuvre: ['🐙', '#FFA6C9'], grenouille: ['🐸', '#9EE6B8'], lapin: ['🐰', '#F3EFE4'],
  manchot: ['🐧', '#B9D8F5'], raton: ['🦝', '#D6CFBD'], tigre: ['🐯', '#FFC56B'], licorne: ['🦄', '#F6C8E8'],
};
export const AVATARS = Object.keys(EMOJIS);

export function Avatar({ nom, taille = 40 }: { nom: string; taille?: number }) {
  const [emoji, fond] = EMOJIS[nom] ?? EMOJIS.renard;
  return (
    <span className="avatar" style={{ width: taille, height: taille, fontSize: taille * 0.56, ['--fond-av' as string]: fond }} aria-hidden="true">
      <span>{emoji}</span>
    </span>
  );
}
