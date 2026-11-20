import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { ConversationChatPage } from "@/features/messages/components/conversation-chat-page";

interface EmployerConversationRouteProps {
  params: Promise<{ id: string }>;
}

export const instant = false;

export default function EmployerConversationRoute({
  params,
}: EmployerConversationRouteProps) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
          <Skeleton className="h-[min(42rem,calc(100vh-7rem))] rounded-2xl" />
        </main>
      }
    >
      <ResolvedEmployerConversationRoute params={params} />
    </Suspense>
  );
}

async function ResolvedEmployerConversationRoute({
  params,
}: EmployerConversationRouteProps) {
  const { id } = await params;
  return <ConversationChatPage conversationId={id} role="EMPLOYER" />;
}
