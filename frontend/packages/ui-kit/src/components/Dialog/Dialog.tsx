import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useI18n } from '../../i18n/useI18n';
import { CloseIcon } from '../icons';

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
 * Escape closes it, and the page behind is inert while it is open.
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
    <dialog ref={ref} className="lf-dialog" aria-labelledby={titleId} onClose={handleClose}>
      <div className="lf-dialog__header">
        <h2 id={titleId} className="lf-dialog__title">
          {title}
        </h2>
        <button
          type="button"
          className="lf-dialog__close"
          aria-label={t('ui.dialog.close')}
          onClick={() => {
            ref.current?.close();
          }}
        >
          <CloseIcon />
        </button>
      </div>
      <div className="lf-dialog__body">{children}</div>
    </dialog>
  );
}
