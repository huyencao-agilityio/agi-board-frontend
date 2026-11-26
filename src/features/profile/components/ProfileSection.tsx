import { zodResolver } from '@hookform/resolvers/zod'
import { useRef, useState, type ChangeEvent } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { Avatar } from '@/components/common/Avatar'
import { BTN, FIELD, LABEL } from '@/components/common/form-styles'
import Spinner from '@/components/common/Spinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { errorCode } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Profile } from '../api'
import { useRemoveAvatar, useUpdateName, useUploadAvatar } from '../hooks'
import { CARD, ERROR, HEADING, SMALL_BTN, type Report } from './styles'

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_PHOTO_BYTES = 5 * 1024 * 1024
const PHOTO_ERROR = 'Choose a JPG, PNG or WebP image up to 5 MB.'

// At least one non-space character, no maximum length, trimmed on save (decisions #36, #102).
const schema = z.object({ fullName: z.string().trim().min(1) })

export function ProfileSection({ profile, onStart, onFail }: { profile: Profile } & Report) {
  const save = useUpdateName()
  const upload = useUploadAvatar()
  const remove = useRemoveAvatar()
  // Starts from the saved name; ProfilePage keys this section on it, so a new saved name resets it.
  const { register, handleSubmit, control, formState } = useForm({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { fullName: profile.fullName },
  })
  const name = useWatch({ control, name: 'fullName' })
  const [photoError, setPhotoError] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const busy = save.isPending || upload.isPending || remove.isPending
  // Typing the saved name back counts as unchanged.
  const canSave = formState.isValid && name.trim() !== profile.fullName && !busy

  const onSave = handleSubmit((values) => {
    if (!canSave) return
    onStart()
    save.mutate(values, { onError: onFail })
  })

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // Reset so picking the same file again still fires a change.
    e.target.value = ''
    if (!file) return
    onStart()
    if (!PHOTO_TYPES.includes(file.type) || file.size > MAX_PHOTO_BYTES) {
      setPhotoError(true)
      return
    }
    setPhotoError(false)
    upload.mutate(file, {
      onError: (err) => {
        const code = errorCode(err)
        if (code === 'PAYLOAD_TOO_LARGE' || code === 'UNSUPPORTED_IMAGE_TYPE') setPhotoError(true)
        else onFail()
      },
    })
  }

  function onRemove() {
    onStart()
    setPhotoError(false)
    remove.mutate(undefined, { onError: onFail })
  }

  return (
    <section aria-labelledby="profile-heading" className={CARD}>
      <h2 id="profile-heading" className={HEADING}>
        Profile
      </h2>
      <div className="flex items-center gap-3">
        <Avatar name={profile.fullName} url={profile.avatarUrl} size="lg" />
        <input
          ref={fileInput}
          type="file"
          accept={PHOTO_TYPES.join(',')}
          className="hidden"
          tabIndex={-1}
          aria-hidden="true"
          onChange={onPick}
        />
        <Button
          type="button"
          variant="outline"
          className={SMALL_BTN}
          disabled={busy}
          aria-describedby={photoError ? 'photo-error' : undefined}
          onClick={() => fileInput.current?.click()}
        >
          {upload.isPending ? <Spinner /> : null}
          <span className={cn(upload.isPending && 'sr-only')}>Upload photo</span>
        </Button>
        {profile.avatarUrl && (
          <Button
            type="button"
            variant="outline"
            className={cn(SMALL_BTN, 'border-destructive text-destructive')}
            disabled={busy}
            onClick={onRemove}
          >
            {remove.isPending ? <Spinner /> : null}
            <span className={cn(remove.isPending && 'sr-only')}>Remove photo</span>
          </Button>
        )}
      </div>
      {photoError && (
        <p id="photo-error" role="alert" className={ERROR}>
          {PHOTO_ERROR}
        </p>
      )}
      <form onSubmit={onSave} className="flex flex-col gap-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="full-name" className={LABEL}>
            Full name
          </label>
          <Input id="full-name" className={FIELD} disabled={busy} {...register('fullName')} />
        </div>
        <div>
          <Button type="submit" className={cn(BTN, 'w-auto')} disabled={!canSave}>
            {save.isPending ? <Spinner /> : null}
            <span className={cn(save.isPending && 'sr-only')}>Save</span>
          </Button>
        </div>
      </form>
    </section>
  )
}
