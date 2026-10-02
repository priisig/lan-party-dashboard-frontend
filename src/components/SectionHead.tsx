import type { ReactNode } from 'react';
import { AccentText } from './AccentText';

/** "// SERVER" eyebrow + big heading, with optional content on the right. */
export function SectionHead({ id, eyebrow, title, as = 'h2', children }: { id?: string; eyebrow: string; title: string; as?: 'h1' | 'h2'; children?: ReactNode }) {
  const Heading = as;
  return (
    <div className="section-head">
      <div>
        <div className="eyebrow">// {eyebrow}</div>
        <Heading id={id} className={as === 'h1' ? 'page-title' : 'section-title'}>
          <AccentText text={title} />
        </Heading>
      </div>
      {children}
    </div>
  );
}
