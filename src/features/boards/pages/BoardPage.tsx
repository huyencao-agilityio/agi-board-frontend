import { Outlet, useParams } from 'react-router'
import { useBoardSocket } from '@/lib/ws'

// WEB-07 Board — placeholder until its sprint. <Outlet /> renders WEB-08 Card window over the board.
export default function BoardPage() {
  const { boardId } = useParams()
  useBoardSocket(boardId)
  return (
    <>
      <h1 className="text-2xl font-extrabold">Board</h1>
      <Outlet />
    </>
  )
}
