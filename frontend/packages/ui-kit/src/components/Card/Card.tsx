import { useId, type ReactNode } from 'react';

export interface CardProps {
  title: ReactNode;
  /** Heading level of the title, to fit the page outline. */
  headingLevel?: 2 | 3 | 4;
  children?: ReactNode;
}

/** A surface with a heading, labelled by that heading for assistive technology. */
export function Card({ title, headingLevel = 2, children }: CardProps) {
  const titleId = useId();
  const Heading = `h${String(headingLevel)}` as 'h2' | 'h3' | 'h4';

  return (
    <section className="lf-card" aria-labelledby={titleId}>
      <Heading id={titleId} className="lf-card__title">
        {title}
      </Heading>
      {children !== undefined && <div className="lf-card__body">{children}</div>}
    </section>
  );
}
