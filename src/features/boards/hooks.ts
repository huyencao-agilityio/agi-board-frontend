import { useMutation, useQueryClient } from '@tanstack/react-query'
import { recordView } from './api'

/** Records that the board was opened; Home's Recently viewed refetches on success. */
export function useRecordView() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: recordView,
    onSuccess: () => client.invalidateQueries({ queryKey: ['home'] }),
  })
}
