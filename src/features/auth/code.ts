const CODE_LENGTH = 6

/** One entry per box of OtpInput, '' when empty. */
export const EMPTY_CODE: string[] = Array.from({ length: CODE_LENGTH }, () => '')

export const isFullCode = (digits: string[]) => digits.every(Boolean)
