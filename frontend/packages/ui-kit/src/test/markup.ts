import type { ReactNode } from 'react';
import { renderToString } from 'react-dom/server';

/**
 * Renders to HTML with only the `lf-` hooks left in each class list (ADR 0043), so a test checks
 * a component's structure and hooks while the Tailwind utilities beside them are free to change.
 * An element left with no hooks loses its class attribute.
 */
export function renderMarkup(node: ReactNode): string {
  return renderToString(node).replace(/ class="([^"]*)"/g, (_, classes: string) => {
    const hooks = classes.split(' ').filter((name) => name.startsWith('lf-'));
    return hooks.length === 0 ? '' : ` class="${hooks.join(' ')}"`;
  });
}
