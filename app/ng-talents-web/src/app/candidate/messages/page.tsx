import { AuthGuard } from "@/features/auth/components/auth-guard";
import { MessagesInboxPage } from "@/features/messages/components/messages-inbox-page";

export default function CandidateMessagesRoute() {
  return (
    <AuthGuard requiredRole="CANDIDATE">
      <MessagesInboxPage role="CANDIDATE" />
    </AuthGuard>
  );
}
