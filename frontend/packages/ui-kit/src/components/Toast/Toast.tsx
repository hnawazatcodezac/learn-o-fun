import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '../../cn';
import { useI18n } from '../../i18n/useI18n';
import { CloseIcon } from '../icons';
import { FOCUS_CLASSES, ICON_BUTTON_CLASSES } from '../pieces';

/** How long a toast stays before hiding itself. Hover or keyboard focus pauses it. */
export const TOAST_DURATION_MS = 8000;

/** Older toasts make way when more than this many are showing. */
const MAX_TOASTS = 3;

interface ToastItem {
  id: number;
  message: string;
}

const ToastContext = createContext<((message: string) => void) | null>(null);

export interface ToastProviderProps {
  children: ReactNode;
  durationMs?: number;
  /** Messages showing from the start, for previews and tests. */
  initialMessages?: readonly string[];
}

/**
 * Short confirmations such as "Settings saved", announced politely to screen readers. Only for
 * results that are visible anyway; never for errors or anything that needs action.
 */
export function ToastProvider({
  children,
  durationMs = TOAST_DURATION_MS,
  initialMessages = [],
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>(() =>
    initialMessages.map((message, index) => ({ id: index + 1, message })),
  );
  const nextId = useRef(initialMessages.length + 1);

  const show = useCallback((message: string) => {
    const id = nextId.current;
    nextId.current += 1;
    setToasts((current) => [...current.slice(-(MAX_TOASTS - 1)), { id, message }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        className="lf-toast-region fixed inset-e-5 inset-be-5 z-10 flex flex-col items-end gap-3 max-inline-ui-toast"
        role="status"
      >
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            message={toast.message}
            durationMs={durationMs}
            onDismiss={dismiss}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Shows a toast. Use inside `ToastProvider`. */
export function useToast() {
  const show = useContext(ToastContext);
  if (!show) throw new Error('useToast must be used inside ToastProvider');
  return { show };
}

interface ToastProps {
  id: number;
  message: string;
  durationMs: number;
  onDismiss: (id: number) => void;
}

function Toast({ id, message, durationMs, onDismiss }: ToastProps) {
  const { t } = useI18n();
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => {
      onDismiss(id);
    }, durationMs);
    return () => {
      clearTimeout(timer);
    };
  }, [paused, durationMs, onDismiss, id]);

  const pause = () => {
    setPaused(true);
  };
  const resume = () => {
    setPaused(false);
  };

  // A toast floats on shadow-lg. It fades in, and rises only when motion is allowed.
  return (
    <div
      className="lf-toast flex animate-ui-toast items-center gap-3 rounded-ui bg-surface-raised py-2 ps-4 pe-2 text-ink shadow-lg"
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
    >
      <p className="lf-toast__message m-0">{message}</p>
      <button
        type="button"
        className={cn('lf-toast__close', ICON_BUTTON_CLASSES, FOCUS_CLASSES)}
        aria-label={t('ui.toast.close')}
        onClick={() => {
          onDismiss(id);
        }}
      >
        <CloseIcon />
      </button>
    </div>
  );
}
