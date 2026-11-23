import { Outlet } from 'react-router'

// WEB-01, 02, 14, 15, 16: centered card, no page header.
export default function AuthLayout() {
  return (
    <main className="flex min-h-svh items-center justify-center p-8">
      <div className="w-full max-w-100 rounded-(--radius-xl) border bg-(--color-surface) p-8 shadow-[0_12px_32px_-8px_color-mix(in_srgb,var(--color-inverse-bg)_14%,transparent),0_2px_6px_color-mix(in_srgb,var(--color-inverse-bg)_6%,transparent)]">
        <Outlet />
      </div>
    </main>
  )
}
