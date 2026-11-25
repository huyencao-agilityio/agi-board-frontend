import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { EMPTY_CODE } from '@/features/auth/code'
import { OtpInput } from './OtpInput'

function setup(props: { disabled?: boolean; invalid?: boolean } = {}) {
  const onComplete = vi.fn()
  function Harness() {
    const [value, setValue] = useState(EMPTY_CODE)
    return <OtpInput value={value} onChange={setValue} onComplete={onComplete} {...props} />
  }
  render(<Harness />)
  return { user: userEvent.setup(), onComplete }
}

const boxes = () => screen.getAllByRole<HTMLInputElement>('textbox')
const shown = () =>
  boxes()
    .map((b) => b.value || '_')
    .join('')

describe('OtpInput', () => {
  it('labels the boxes and lets only the first one be autofilled', () => {
    setup()
    expect(screen.getByRole('group', { name: '6-digit code' })).toBeInTheDocument()
    expect(boxes()).toHaveLength(6)
    expect(screen.getByLabelText('Digit 6')).toBeInTheDocument()
    expect(boxes()[0]).toHaveAttribute('autocomplete', 'one-time-code')
    expect(boxes()[0]).not.toHaveAttribute('maxlength')
  })

  it('takes digits only, moves on, and completes once on the 6th digit', async () => {
    const { user, onComplete } = setup()
    await user.click(boxes()[0])
    await user.keyboard('1a2-345')
    expect(shown()).toBe('12345_')
    expect(onComplete).not.toHaveBeenCalled()
    await user.keyboard('6')
    expect(onComplete).toHaveBeenCalledExactlyOnceWith('123456')
  })

  it.each(['123456', '123 456', '123-456', ' 1234567'])(
    'fills all boxes from a paste of "%s"',
    async (text) => {
      const { user, onComplete } = setup()
      await user.click(boxes()[3])
      await user.paste(text)
      expect(shown()).toBe('123456')
      expect(onComplete).toHaveBeenCalledExactlyOnceWith('123456')
    },
  )

  it('puts a short paste where the cursor is', async () => {
    const { user } = setup()
    await user.click(boxes()[2])
    await user.paste('78')
    expect(shown()).toBe('__78__')
    expect(boxes()[4]).toHaveFocus()
  })

  it('moves with the arrows and deletes backwards', async () => {
    const { user } = setup()
    await user.click(boxes()[0])
    await user.keyboard('123')
    expect(boxes()[3]).toHaveFocus()
    await user.keyboard('{Backspace}')
    expect(shown()).toBe('12____')
    expect(boxes()[2]).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(boxes()[1]).toHaveFocus()
    await user.keyboard('{Backspace}')
    expect(shown()).toBe('1_____')
    await user.keyboard('{ArrowRight}')
    expect(boxes()[2]).toHaveFocus()
  })

  it('replaces a digit without completing again', async () => {
    const { user, onComplete } = setup()
    await user.click(boxes()[0])
    await user.keyboard('123456')
    await user.click(boxes()[1])
    await user.keyboard('9')
    expect(shown()).toBe('193456')
    expect(onComplete).toHaveBeenCalledOnce()
  })

  it('moves on when the digit typed is the one already in the box', async () => {
    const { user, onComplete } = setup()
    await user.click(boxes()[0])
    await user.paste('123956')
    await user.click(boxes()[0])
    await user.keyboard('123456')
    expect(shown()).toBe('123456')
    expect(onComplete).toHaveBeenCalledOnce() // by the paste; the code was full all along
  })

  it('completes a partly typed code that is typed again from the start', async () => {
    const { user, onComplete } = setup()
    await user.click(boxes()[0])
    await user.keyboard('12')
    await user.click(boxes()[0])
    await user.keyboard('123456')
    expect(shown()).toBe('123456')
    expect(onComplete).toHaveBeenCalledExactlyOnceWith('123456')
  })

  it.each(['123456', '123 456', '123-456'])('spreads an autofill of "%s"', (text) => {
    const { onComplete } = setup()
    // userEvent has no autofill: the browser sets the whole text on the first box.
    fireEvent.input(boxes()[0], { target: { value: text } })
    expect(shown()).toBe('123456')
    expect(onComplete).toHaveBeenCalledExactlyOnceWith('123456')
  })

  it.each([
    ['before', 0, '9', '19____'],
    ['after', 1, '9', '19____'],
    ['after', 1, '2', '12____'],
  ])('replaces an unselected digit when typing %s it', async (_where, caret, key, expected) => {
    const { user } = setup()
    await user.click(boxes()[0])
    await user.keyboard('12')
    await user.click(boxes()[1])
    boxes()[1].setSelectionRange(caret, caret)
    await user.keyboard(key)
    expect(shown()).toBe(expected)
    expect(boxes()[2]).toHaveFocus()
  })

  it('can be disabled and marked invalid', () => {
    setup({ disabled: true, invalid: true })
    boxes().forEach((b) => {
      expect(b).toBeDisabled()
      expect(b).toBeInvalid()
    })
  })
})
