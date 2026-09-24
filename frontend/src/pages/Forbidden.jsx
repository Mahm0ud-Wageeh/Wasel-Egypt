import { Link } from 'react-router-dom'
import { StateBlock } from '../components/ui/Feedback'
import { Icon } from '../components/ui/Icon'

/** 403 — role-gated areas (admin/moderation) reached without permission. */
export default function Forbidden() {
  return (
    <StateBlock
      tone="error"
      icon={<Icon name="shield" size={22} aria-hidden="true" />}
      title="No access"
      message="This area is limited to administrators. If you believe this is a mistake, contact support."
      action={
        <Link to="/home" className="btn btn--primary btn--sm">
          Back to home
        </Link>
      }
    />
  )
}
