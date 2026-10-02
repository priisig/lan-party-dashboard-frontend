import fallbackLogo from '../assets/logo.jpg';

/** Event logo; dark backgrounds of raster logos blend away via mix-blend-mode: lighten. */
export function Logo({ src, className }: { src: string | null | undefined; className?: string }) {
  return <img className={className} src={src ?? fallbackLogo} alt="" style={{ mixBlendMode: 'lighten', objectFit: 'contain' }} />;
}
