import { CARD, HEADING } from './styles'

/** Status only: Google is linked by signing in with Google on the same email (decision #27). */
export function GoogleSection({ linked }: { linked: boolean }) {
  return (
    <section aria-labelledby="google-heading" className={CARD}>
      <h2 id="google-heading" className={HEADING}>
        Google
      </h2>
      <p>
        Google: <b>{linked ? 'Linked' : 'Not linked'}</b>
      </p>
    </section>
  )
}
