import { Link } from 'react-router-dom';
import { InboxIcon } from '../components/icons';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <EmptyState
        icon={<InboxIcon size={26} />}
        title="Page not found"
        description="The page you are looking for does not exist."
        action={<Link to="/scheduled"><Button pill>Go to dashboard</Button></Link>}
      />
    </div>
  );
}
