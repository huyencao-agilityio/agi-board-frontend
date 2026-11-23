/** Ring spinner from the mockups (18px, 3px ring in the current text color). */
export default function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-[18px] animate-spin rounded-full border-[3px] border-current/30 border-t-current motion-reduce:animate-none"
    />
  )
}
