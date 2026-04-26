import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <section className="card">
      <h2>Page not found</h2>
      <p>The page you tried to visit does not exist.</p>
      <Link to="/login" className="inline-link">
        Go back to login
      </Link>
    </section>
  )
}