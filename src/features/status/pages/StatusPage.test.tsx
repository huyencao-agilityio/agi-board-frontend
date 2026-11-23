import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { expect, test } from 'vitest'
import { server } from '@/test/server'
import StatusPage from './StatusPage'

const API = import.meta.env.VITE_API_BASE_URL

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <StatusPage />
    </QueryClientProvider>,
  )
}

test('shows OK when the API and the database answer', async () => {
  server.use(
    http.get(`${API}/health`, () => HttpResponse.json({ status: 'ok' })),
    http.get(`${API}/health/db`, () => HttpResponse.json({ status: 'ok' })),
  )
  renderPage()
  expect(await screen.findByText('API: OK')).toBeInTheDocument()
  expect(await screen.findByText('Database: OK')).toBeInTheDocument()
})

test('shows the status code when the database is down', async () => {
  server.use(
    http.get(`${API}/health`, () => HttpResponse.json({ status: 'ok' })),
    http.get(`${API}/health/db`, () =>
      HttpResponse.json(
        { error: { code: 'DB_UNAVAILABLE', message: 'Database unreachable' } },
        { status: 503 },
      ),
    ),
  )
  renderPage()
  expect(await screen.findByText('API: OK')).toBeInTheDocument()
  expect(await screen.findByText('Database: Error (503)')).toBeInTheDocument()
})

test('shows unreachable when the API cannot be called', async () => {
  server.use(
    http.get(`${API}/health`, () => HttpResponse.error()),
    http.get(`${API}/health/db`, () => HttpResponse.error()),
  )
  renderPage()
  expect(await screen.findByText('API: Error (unreachable)')).toBeInTheDocument()
})
