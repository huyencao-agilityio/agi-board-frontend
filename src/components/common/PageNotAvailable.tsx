import { Link } from 'react-router'

// WEB-13 Page not available — placeholder until its sprint; copy labels from the spec.
export default function PageNotAvailable() {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-extrabold">Page not available</h1>
      <Link to="/" className="font-bold text-primary-text underline">
        Home
      </Link>
    </div>
  )
}
