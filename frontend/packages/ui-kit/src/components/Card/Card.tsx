import { useId, type ReactNode } from 'react';

export interface CardProps {
  title: ReactNode;
  /** Heading level of the title, to fit the page outline. */
  headingLevel?: 2 | 3 | 4;
  children?: ReactNode;
}

/**
 * A surface with a heading, labelled by that heading for assistive technology. It rests on
 * shadow-sm, in surface-raised with a line border (design system README).
 */
export function Card({ title, headingLevel = 2, children }: CardProps) {
  const titleId = useId();
  const Heading = `h${String(headingLevel)}` as 'h2' | 'h3' | 'h4';

  return (
    <section
      className="lf-card flex flex-col gap-3 rounded-ui border border-line bg-surface-raised p-ui-card text-ink shadow-sm"
      aria-labelledby={titleId}
    >
      <Heading id={titleId} className="lf-card__title m-0 font-ui-heading text-ui-heading">
        {title}
      </Heading>
      {children !== undefined && (
        <div className="lf-card__body flex flex-col items-start gap-4 text-ink-muted [&>p]:m-0">
          {children}
        </div>
      )}
    </section>
  );
}
