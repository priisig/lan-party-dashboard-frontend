/** Initials tile for an account (there are no profile pictures). */
export function initials(nickname: string | null | undefined): string {
  const name = (nickname ?? '').trim();
  if (!name) return '?';
  const parts = name.split(/[\s_.-]+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2);
  return letters.toUpperCase();
}

export function Avatar({ nickname, size = 'sm' }: { nickname: string | null | undefined; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={`avatar avatar--${size}`} aria-hidden="true">
      {initials(nickname)}
    </span>
  );
}
