import { Link } from 'react-router-dom'
import { StateBlock } from '../components/ui/Feedback'
import { Icon } from '../components/ui/Icon'

export default function NotFound() {
  return (
    <StateBlock
      icon={<Icon name="navigate" size={22} aria-hidden="true" />}
      title="Page not found"
      message="The page you are looking for does not exist or has moved."
      action={
        <Link to="/home" className="btn btn--primary btn--sm">
          Back to home
        </Link>
      }
    />
  )
}
