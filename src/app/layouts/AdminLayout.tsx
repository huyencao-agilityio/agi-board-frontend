import { Outlet } from 'react-router'

// WEB-10, WEB-19. Reached only through RequireSystemRole (Support, Super admin).
export default function AdminLayout() {
  return (
    <div className="mx-auto flex max-w-275 flex-col gap-5">
      <p className="text-sm font-bold text-muted-foreground">Admin console</p>
      <Outlet />
    </div>
  )
}
