import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Avatar } from './Avatar'

describe('Avatar initials', () => {
  it.each([
    ['An Nguyen', 'AN'],
    ['  le van  binh ', 'LB'],
    ['Madonna', 'M'],
  ])('%s → %s', (name, expected) => {
    render(<Avatar name={name} url={null} size="sm" />)
    expect(screen.getByText(expected)).toBeInTheDocument()
  })
})

describe('Avatar', () => {
  it('shows the photo from the API origin', () => {
    render(<Avatar name="An Nguyen" url="/api/v1/users/me/avatar?v=2" size="lg" />)
    const img = screen.getByRole('img', { name: 'An Nguyen' })
    expect(img).toHaveAttribute(
      'src',
      new URL('/api/v1/users/me/avatar?v=2', import.meta.env.VITE_API_BASE_URL).href,
    )
  })

  it('shows initials without a photo', () => {
    render(<Avatar name="An Nguyen" url={null} size="sm" />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('AN')).toBeInTheDocument()
  })
})

describe('Avatar broken photo', () => {
  it('falls back to initials when the image fails to load', () => {
    render(<Avatar name="An Nguyen" url="/api/v1/users/me/avatar?v=9" size="sm" />)
    fireEvent.error(screen.getByRole('img', { name: 'An Nguyen' }))
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('AN')).toBeInTheDocument()
  })
})
