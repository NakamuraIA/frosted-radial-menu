import { useEffect, useRef } from 'react';

import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

/** Diálogo de confirmação para ações destrutivas ou que descartam alterações. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'primary',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    confirmRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="ui-dialog-overlay" role="presentation" onMouseDown={onCancel}>
      <div
        className="ui-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ui-dialog-title"
        aria-describedby="ui-dialog-description"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="ui-dialog-title">{title}</h2>
        <p id="ui-dialog-description">{description}</p>
        <div className="ui-dialog__actions">
          <Button variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            variant={tone === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
