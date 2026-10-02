import fallbackLogo from '../assets/logo.png';

/** Event logo on a light rounded tile, as in the design. Size comes from the className. */
export function Logo({ src, className }: { src: string | null | undefined; className?: string }) {
  return (
    <span className={'logo-tile' + (className ? ' ' + className : '')}>
      <img src={src ?? fallbackLogo} alt="" />
    </span>
  );
}
