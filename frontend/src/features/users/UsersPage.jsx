import { useState } from 'react'
import { Button, IconButton } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ErrorBanner, GlassCard, Loading, PageHeader } from '@/components/ui/Feedback'
import { EditIcon, KeyIcon, PlusIcon, TrashIcon } from '@/components/ui/icons'
import { Modal } from '@/components/ui/Modal'
import { StatusBadge } from '@/components/ui/Status'
import { ROLE_LABELS } from '@/features/auth/types'
import { useCurrentUser } from '@/features/auth/useAuth'
import { errorMessage } from '@/lib/api'
import { formatDate, initials } from '@/lib/format'
import { useToast } from '@/lib/toast'
import { useDeleteUser, useUsers } from './api'
import { CreateUserForm, EditUserForm, ResetPasswordForm } from './UserForms'

/** @typedef {import('@/features/auth/types').User} User */
/** @typedef {{ kind: 'create' } | { kind: 'edit', user: User } | { kind: 'password', user: User } | null} Dialog */

const DIALOG_TITLES = { create: 'Crear usuario', edit: 'Editar usuario', password: 'Restablecer contraseña' }
const COLUMNS = 'grid-cols-[2fr_1fr_1fr_1fr_150px]'

export function UsersPage() {
  const users = useUsers()
  const { data: me } = useCurrentUser()
  const remove = useDeleteUser()
  const { notify } = useToast()
  const [dialog, setDialog] = useState(/** @type {Dialog} */ (null))
  const [toDelete, setToDelete] = useState(/** @type {User | null} */ (null))
  const close = () => setDialog(null)

  function confirmDelete() {
    const user = toDelete
    remove.mutate(user.id, {
      onSuccess: () => {
        setToDelete(null)
        notify({ title: 'Usuario eliminado', description: user.fullName })
      },
    })
  }

  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Los administradores agregan equipos y cuentas. Solo lectura puede ver el estado de la red."
        actions={
          <Button variant="glass" icon={<PlusIcon />} onClick={() => setDialog({ kind: 'create' })}>
            Crear usuario
          </Button>
        }
      />

      {users.isPending && <Loading />}
      {users.error && <ErrorBanner message={errorMessage(users.error)} />}

      {users.data && (
        <GlassCard className="gap-0! overflow-x-auto px-0! py-0!">
          <div className="min-w-[820px]">
            <div className={`grid ${COLUMNS} gap-3 px-6 pt-4 pb-3 text-[13px] font-medium text-muted`}>
              <span>Usuario</span>
              <span>Rol</span>
              <span>Cuenta</span>
              <span>Creada</span>
              <span className="sr-only">Acciones</span>
            </div>
            {users.data.map((user) => {
              const isMe = user.id === me?.id
              return (
                <div key={user.id} className={`grid ${COLUMNS} min-h-[68px] items-center gap-3 border-t border-line pr-2 pl-6`}>
                  <div className="flex min-w-0 items-center gap-3">
                    <span aria-hidden="true" className="inline-flex size-[38px] shrink-0 items-center justify-center rounded-full border border-accent-border bg-accent-bg text-[13px] font-semibold">
                      {initials(user.fullName)}
                    </span>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-[15px] font-semibold">
                        {user.fullName}
                        {isMe && <span className="font-normal text-muted"> (tú)</span>}
                      </span>
                      <span className="font-mono text-[13px] text-muted">{user.username}</span>
                    </div>
                  </div>
                  <span
                    className={`w-fit rounded-full border px-3 py-1 text-[13px] font-medium ${user.role === 'ADMIN' ? 'border-accent bg-accent-bg text-accent-strong' : 'border-field-border bg-tile text-muted'}`}
                  >
                    {ROLE_LABELS[user.role]}
                  </span>
                  <StatusBadge status={user.enabled ? 'UP' : 'UNKNOWN'} label={user.enabled ? 'Activa' : 'Deshabilitada'} />
                  <span className="text-sm text-muted">{formatDate(user.createdAt)}</span>
                  <div className="flex justify-end">
                    <IconButton label={`Editar a ${user.fullName}`} onClick={() => setDialog({ kind: 'edit', user })}>
                      <EditIcon />
                    </IconButton>
                    <IconButton label={`Restablecer la contraseña de ${user.fullName}`} onClick={() => setDialog({ kind: 'password', user })}>
                      <KeyIcon />
                    </IconButton>
                    {!isMe && (
                      <IconButton label={`Eliminar a ${user.fullName}`} tone="danger" onClick={() => setToDelete(user)}>
                        <TrashIcon />
                      </IconButton>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </GlassCard>
      )}

      <Modal open={dialog !== null} title={dialog ? DIALOG_TITLES[dialog.kind] : ''} onClose={close}>
        {dialog?.kind === 'create' && <CreateUserForm onDone={close} />}
        {dialog?.kind === 'edit' && <EditUserForm key={dialog.user.id} user={dialog.user} onDone={close} />}
        {dialog?.kind === 'password' && <ResetPasswordForm key={dialog.user.id} user={dialog.user} onDone={close} />}
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title="¿Eliminar este usuario?"
        confirmLabel="Eliminar usuario"
        loading={remove.isPending}
        error={remove.error ? errorMessage(remove.error) : null}
        onCancel={() => {
          setToDelete(null)
          remove.reset()
        }}
        onConfirm={confirmDelete}
      >
        <strong className="font-semibold text-ink">{toDelete?.fullName}</strong> ya no podrá iniciar sesión en SMRED. No se puede deshacer.
      </ConfirmDialog>
    </>
  )
}
