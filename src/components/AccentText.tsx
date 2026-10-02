import { Fragment } from 'react';
import { parseAccent } from '../lib/accent';

/** Renders {farbe:Text} markup as coloured spans; line breaks become <br>. */
export function AccentText({ text }: { text: string | null | undefined }) {
  return (
    <>
      {parseAccent(text).map((seg, i) => {
        const lines = seg.text.split('\n').map((line, j) => (
          <Fragment key={j}>
            {j > 0 && <br />}
            {line}
          </Fragment>
        ));
        return seg.color ? (
          <span key={i} className={`accent--${seg.color}`}>
            {lines}
          </span>
        ) : (
          <Fragment key={i}>{lines}</Fragment>
        );
      })}
    </>
  );
}
