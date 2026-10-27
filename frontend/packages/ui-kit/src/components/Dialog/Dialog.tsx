import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cn } from '../../cn';
import { useI18n } from '../../i18n/useI18n';
import { CloseIcon } from '../icons';
import { FOCUS_CLASSES, ICON_BUTTON_CLASSES } from '../pieces';

export interface DialogProps {
  open: boolean;
  title: ReactNode;
  /**
   * Called when the person closes the dialog, with the close button or Escape. Not called when
   * `open` becomes false, so the caller always knows which happened.
   */
  onClose: () => void;
  children?: ReactNode;
}

/**
 * A modal dialog on the native `<dialog>` element: focus moves in and comes back on close,
 * Escape closes it, and the page behind is inert while it is open. It floats on shadow-lg (a 2px
 * border in High contrast) over a dimmed page, fades in, and grows into place only when motion is
 * allowed (ADR 0019).
 */
export function Dialog({ open, title, onClose, children }: DialogProps) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const closingFromProp = useRef(false);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) {
      closingFromProp.current = true;
      dialog.close();
    }
  }, [open]);

  const handleClose = () => {
    if (closingFromProp.current) {
      closingFromProp.current = false;
      return;
    }
    onClose();
  };

  return (
    <dialog
      ref={ref}
      className="lf-dialog rounded-ui border-0 bg-surface-raised p-ui-card text-ink shadow-lg inline-ui-dialog max-block-ui-dialog-height backdrop:bg-ui-backdrop open:animate-ui-dialog"
      aria-labelledby={titleId}
      onClose={handleClose}
    >
      <div className="lf-dialog__header mbe-4 flex items-start justify-between gap-4">
        <h2 id={titleId} className="lf-dialog__title m-0 font-ui-heading text-ui-heading">
          {title}
        </h2>
        <button
          type="button"
          className={cn('lf-dialog__close -me-2 -mbs-2', ICON_BUTTON_CLASSES, FOCUS_CLASSES)}
          aria-label={t('ui.dialog.close')}
          onClick={() => {
            ref.current?.close();
          }}
        >
          <CloseIcon />
        </button>
      </div>
      <div className="lf-dialog__body flex flex-col gap-4 [&>p]:m-0">{children}</div>
    </dialog>
  );
}
