import type { ApplicationStatus, UserRole } from "@/types/api";

export interface MessageSender {
  id: string;
  firstName: string | null;
  lastName: string | null;
  role: "CANDIDATE" | "EMPLOYER";
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  body: string;
  senderId: string;
  sender: MessageSender;
  readAt: string | null;
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  applicationId: string;
  applicationStatus: ApplicationStatus;
  vacancyId: string;
  vacancyTitle: string;
  otherParticipant: {
    id: string;
    displayName: string;
    role: "CANDIDATE" | "EMPLOYER";
  };
  lastMessage: ConversationMessage | null;
  unreadCount: number;
  updatedAt: string;
}

export type ConversationDetail = Omit<
  ConversationSummary,
  "lastMessage" | "unreadCount" | "updatedAt"
>;

export interface PaginatedPage<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type ConversationPage = PaginatedPage<ConversationSummary>;
export type MessagePage = PaginatedPage<ConversationMessage>;

export interface ConversationListParams {
  page: number;
  limit: number;
}

export interface SendMessageInput {
  body: string;
  clientMessageId: string;
}

export type MessagingRole = Extract<UserRole, "CANDIDATE" | "EMPLOYER">;
