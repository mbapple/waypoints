import React, { useState } from 'react';
import { Button } from '../../styles/components';

export default function ConfirmDeleteButton({
  onConfirm,
  children = 'Delete',
  confirmMessage = 'Are you sure you want to delete this item? This action cannot be undone.',
  ...props
}) {
  const [busy, setBusy] = useState(false);
  const handleClick = async () => {
    if (!window.confirm(confirmMessage)) return;
    try {
      setBusy(true);
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button variant="danger" onClick={handleClick} disabled={busy} {...props}>
      {busy ? 'Deleting...' : children}
    </Button>
  );
}
