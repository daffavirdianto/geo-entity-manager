import { useEffect, useRef } from 'react'

interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel?: string
  pending: boolean
  error: string | null
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog(p: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (p.open && !d.open) d.showModal()
    if (!p.open && d.open) d.close()
  }, [p.open])

  return (
    <dialog ref={ref} className="dialog" onCancel={(e) => { e.preventDefault(); if (!p.pending) p.onCancel() }}>
      <h2>{p.title}</h2>
      <p>{p.message}</p>
      {p.error && (
        <p className="form__error" role="alert">
          {p.error}
        </p>
      )}
      <div className="panel__actions">
        <button className="btn btn--danger" onClick={p.onConfirm} disabled={p.pending}>
          {p.pending ? 'Deleting…' : p.confirmLabel}
        </button>
        <button className="btn" onClick={p.onCancel} disabled={p.pending} autoFocus>
          {p.cancelLabel ?? 'Keep it'}
        </button>
      </div>
    </dialog>
  )
}
