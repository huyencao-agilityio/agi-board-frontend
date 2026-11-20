import { Outlet } from 'react-router'

// WEB-01, 02, 14, 15, 16: centered single-column form.
export default function AuthLayout() {
  return (
    <main className="flex min-h-svh items-center justify-center p-8">
      <div className="w-full max-w-100">
        <Outlet />
      </div>
    </main>
  )
}
