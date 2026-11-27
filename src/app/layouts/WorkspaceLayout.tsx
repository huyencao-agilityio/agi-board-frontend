import { Outlet } from 'react-router'
import { WorkspaceSidebar } from '@/features/workspaces/components/WorkspaceSidebar'

// No tabs (decision #370): Boards / Members / Settings are in the Workspace sidebar, `Closed boards` is a link
// under the board tiles (WEB-04) and `Audit log` a link on Settings (WEB-06), as in the mockups.
export default function WorkspaceLayout() {
  return (
    <div className="mx-auto flex max-w-300 gap-8">
      <WorkspaceSidebar />
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <Outlet />
      </div>
    </div>
  )
}
