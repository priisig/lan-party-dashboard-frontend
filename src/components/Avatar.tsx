/** Initials tile for an account (there are no profile pictures). */
export function initials(nickname: string): string {
  const parts = nickname.trim().split(/[\s_.-]+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : nickname.trim().slice(0, 2);
  return letters.toUpperCase();
}

export function Avatar({ nickname, size = 'sm' }: { nickname: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={`avatar avatar--${size}`} aria-hidden="true">
      {initials(nickname)}
    </span>
  );
}
