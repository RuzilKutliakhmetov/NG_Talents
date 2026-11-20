"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { authStore } from "@/features/auth/store";

import {
  getConversation,
  getConversationMessages,
  getConversations,
  getMessageUnreadCount,
  markConversationRead,
  sendConversationMessage,
} from "./api";
import type { ConversationListParams } from "./types";

export const conversationKeys = {
  all: ["messages"] as const,
  lists: (userId: string | null) =>
    [...conversationKeys.all, userId, "conversations"] as const,
  list: (userId: string | null, params: ConversationListParams) =>
    [...conversationKeys.lists(userId), params] as const,
  detail: (userId: string | null, conversationId: string) =>
    [...conversationKeys.all, userId, "conversation", conversationId] as const,
  messages: (userId: string | null, conversationId: string) =>
    [...conversationKeys.all, userId, "conversation", conversationId, "history"] as const,
  unreadCount: (userId: string | null) =>
    [...conversationKeys.all, userId, "unread-count"] as const,
};

function useCurrentUserId() {
  return authStore((state) => state.user?.id ?? null);
}

export function useConversations(params: ConversationListParams) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: conversationKeys.list(userId, params),
    queryFn: () => getConversations(params),
    enabled: Boolean(userId),
  });
}

export function useConversation(conversationId: string) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: conversationKeys.detail(userId, conversationId),
    queryFn: () => getConversation(conversationId),
    enabled: Boolean(userId && conversationId),
  });
}

export function useConversationMessages(conversationId: string) {
  const userId = useCurrentUserId();
  return useInfiniteQuery({
    queryKey: conversationKeys.messages(userId, conversationId),
    queryFn: ({ pageParam }) =>
      getConversationMessages(conversationId, pageParam, 50),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.totalPages
        ? lastPage.pagination.page + 1
        : undefined,
    enabled: Boolean(userId && conversationId),
  });
}

export function useMessageUnreadCount() {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: conversationKeys.unreadCount(userId),
    queryFn: getMessageUnreadCount,
    enabled: Boolean(userId),
  });
}

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn: (input: { body: string; clientMessageId: string }) =>
      sendConversationMessage(conversationId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: conversationKeys.messages(userId, conversationId),
        }),
        queryClient.invalidateQueries({
          queryKey: conversationKeys.lists(userId),
        }),
        queryClient.invalidateQueries({
          queryKey: conversationKeys.unreadCount(userId),
        }),
      ]);
    },
  });
}

export function useMarkConversationRead(conversationId: string) {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn: () => markConversationRead(conversationId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: conversationKeys.lists(userId),
        }),
        queryClient.invalidateQueries({
          queryKey: conversationKeys.unreadCount(userId),
        }),
      ]);
    },
  });
}
