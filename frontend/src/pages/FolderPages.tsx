import { EmailListView } from '../components/emails/EmailListView';

export function ScheduledPage() {
  return <EmailListView folder="scheduled" />;
}

export function SentPage() {
  return <EmailListView folder="sent" />;
}
