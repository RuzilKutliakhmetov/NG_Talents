import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { AuthGuard } from "@/features/auth/components/auth-guard";
import { ConversationChatPage } from "@/features/messages/components/conversation-chat-page";

interface CandidateConversationRouteProps {
  params: Promise<{ id: string }>;
}

export const instant = false;

export default function CandidateConversationRoute({
  params,
}: CandidateConversationRouteProps) {
  return (
    <AuthGuard requiredRole="CANDIDATE">
      <Suspense
        fallback={
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
            <Skeleton className="h-[min(42rem,calc(100vh-7rem))] rounded-2xl" />
          </main>
        }
      >
        <ResolvedCandidateConversationRoute params={params} />
      </Suspense>
    </AuthGuard>
  );
}

async function ResolvedCandidateConversationRoute({
  params,
}: CandidateConversationRouteProps) {
  const { id } = await params;
  return <ConversationChatPage conversationId={id} role="CANDIDATE" />;
}
