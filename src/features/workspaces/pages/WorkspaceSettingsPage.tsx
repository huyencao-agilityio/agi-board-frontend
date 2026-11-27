// WEB-06 Workspace settings — placeholder until its sprint; only the `Audit log` link (the one entry to WEB-12) is in.
import { Link } from 'react-router'

export default function WorkspaceSettingsPage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold">Workspace settings</h1>
      {/* The page is reached from the sidebar by workspace admins only; the server enforces WEB-12 access. */}
      <Link
        to="../audit-log"
        relative="path"
        className="self-start text-sm font-bold text-primary-text underline"
      >
        Audit log
      </Link>
    </div>
  )
}
