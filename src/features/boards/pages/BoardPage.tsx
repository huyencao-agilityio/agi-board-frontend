import { useEffect } from 'react'
import { Outlet, useParams } from 'react-router'
import { useBoardSocket } from '@/lib/ws'
import { useRecordView } from '../hooks'

// WEB-07 Board — placeholder until its sprint. <Outlet /> renders WEB-08 Card window over the board.
export default function BoardPage() {
  const { boardId } = useParams()
  const { mutate: recordView } = useRecordView()
  useBoardSocket(boardId)

  // AC 6.2: feeds Recently viewed once per opened board; a failure (e.g. 404) must not block the board.
  useEffect(() => {
    if (boardId) recordView(boardId)
  }, [boardId, recordView])

  return (
    <>
      <h1 className="text-2xl font-extrabold">Board</h1>
      <Outlet />
    </>
  )
}
