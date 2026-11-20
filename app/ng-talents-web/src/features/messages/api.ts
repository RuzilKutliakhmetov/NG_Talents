import { apiClient } from "@/lib/api/client";

import type {
  ConversationDetail,
  ConversationListParams,
  ConversationPage,
  ConversationMessage,
  MessagePage,
  SendMessageInput,
} from "./types";

export async function getConversations(
  params: ConversationListParams,
): Promise<ConversationPage> {
  const { data } = await apiClient.get<ConversationPage>(
    "/messages/conversations",
    { params },
  );
  return data;
}

export async function getConversation(
  id: string,
): Promise<ConversationDetail> {
  const { data } = await apiClient.get<ConversationDetail>(
    `/messages/conversations/${encodeURIComponent(id)}`,
  );
  return data;
}

export async function getConversationMessages(
  id: string,
  page: number,
  limit: number,
): Promise<MessagePage> {
  const { data } = await apiClient.get<MessagePage>(
    `/messages/conversations/${encodeURIComponent(id)}/messages`,
    { params: { page, limit } },
  );
  return data;
}

export async function sendConversationMessage(
  id: string,
  input: SendMessageInput,
): Promise<ConversationMessage> {
  const { data } = await apiClient.post<ConversationMessage>(
    `/messages/conversations/${encodeURIComponent(id)}/messages`,
    input,
  );
  return data;
}

export async function getMessageUnreadCount(): Promise<number> {
  const { data } = await apiClient.get<{ count: number }>(
    "/messages/unread-count",
  );
  return data.count;
}

export async function markConversationRead(
  id: string,
): Promise<{ updated: number; unreadCount: number }> {
  const { data } = await apiClient.post<{ updated: number; unreadCount: number }>(
    `/messages/conversations/${encodeURIComponent(id)}/read`,
  );
  return data;
}

