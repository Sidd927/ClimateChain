import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "./primitives";

/**
 * Confirmation for irreversible ledger actions, built on the native <dialog>:
 * showModal() gives focus containment, Esc to cancel and an inert background.
 */
export function ConfirmDialog({
  open, title, children, confirmLabel, tone = "primary", busy, onConfirm, onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  tone?: "primary" | "danger";
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => { if (busy) e.preventDefault(); }}
      aria-labelledby={titleId}
      className="m-auto! w-[min(30rem,calc(100vw-2rem))] rounded-sheet border border-rule bg-sheet p-0 text-ink shadow-[var(--shadow-float)]"
    >
      <form method="dialog" onSubmit={(e) => { e.preventDefault(); onConfirm(); }} className="space-y-4 p-5">
        <h2 id={titleId} className="text-lg font-semibold tracking-tight">{title}</h2>
        <div className="space-y-2 text-sm leading-relaxed text-ink-soft">{children}</div>
        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy} autoFocus>Cancel</Button>
          <Button type="submit" variant={tone} busy={busy}>{confirmLabel}</Button>
        </div>
      </form>
    </dialog>
  );
}
