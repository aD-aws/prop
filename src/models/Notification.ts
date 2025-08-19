import { z } from 'zod';

export const NotificationTypeSchema = z.enum([
  'project_created',
  'project_updated',
  'sow_generated',
  'sow_distributed',
  'quote_received',
  'quote_selected',
  'contract_generated',
  'contract_signed',
  'milestone_reached',
  'communication_message',
  'system_alert'
]);

export const NotificationChannelSchema = z.enum([
  'email',
  'in_app',
  'websocket'
]);

export const NotificationPrioritySchema = z.enum([
  'low',
  'medium',
  'high',
  'urgent'
]);

export const NotificationStatusSchema = z.enum([
  'pending',
  'sent',
  'delivered',
  'read',
  'failed'
]);

export const NotificationSchema = z.object({
  PK: z.string(), // NOTIFICATION#{notificationId}
  SK: z.string(), // METADATA
  id: z.string(),
  userId: z.string(),
  type: NotificationTypeSchema,
  title: z.string(),
  message: z.string(),
  data: z.record(z.any()).optional(),
  channels: z.array(NotificationChannelSchema),
  priority: NotificationPrioritySchema,
  status: NotificationStatusSchema,
  templateId: z.string().optional(),
  projectId: z.string().optional(),
  quoteId: z.string().optional(),
  contractId: z.string().optional(),
  scheduledFor: z.string().optional(), // ISO string
  sentAt: z.string().optional(), // ISO string
  readAt: z.string().optional(), // ISO string
  createdAt: z.string(),
  updatedAt: z.string(),
  GSI1PK: z.string(), // userId for user notifications
  GSI1SK: z.string(), // status#createdAt for sorting
  GSI2PK: z.string().optional(), // projectId for project notifications
  GSI2SK: z.string().optional() // type#createdAt for filtering
});

export const NotificationPreferencesSchema = z.object({
  PK: z.string(), // USER#{userId}
  SK: z.string(), // NOTIFICATION_PREFERENCES
  userId: z.string(),
  emailEnabled: z.boolean().default(true),
  inAppEnabled: z.boolean().default(true),
  websocketEnabled: z.boolean().default(true),
  preferences: z.record(z.object({
    email: z.boolean().default(true),
    inApp: z.boolean().default(true),
    websocket: z.boolean().default(true)
  })),
  gdprOptOut: z.boolean().default(false),
  unsubscribeToken: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const MessageSchema = z.object({
  PK: z.string(), // PROJECT#{projectId}
  SK: z.string(), // MESSAGE#{messageId}
  id: z.string(),
  projectId: z.string(),
  senderId: z.string(),
  recipientId: z.string(),
  subject: z.string().optional(),
  content: z.string(),
  attachments: z.array(z.object({
    filename: z.string(),
    url: z.string(),
    size: z.number()
  })).optional(),
  isRead: z.boolean().default(false),
  readAt: z.string().optional(), // ISO string
  createdAt: z.string(),
  GSI3PK: z.string(), // recipientId for recipient messages
  GSI3SK: z.string() // createdAt for sorting
});

export const NotificationTemplateSchema = z.object({
  PK: z.string(), // TEMPLATE#{templateId}
  SK: z.string(), // METADATA
  id: z.string(),
  name: z.string(),
  type: NotificationTypeSchema,
  subject: z.string(),
  emailTemplate: z.string(),
  inAppTemplate: z.string(),
  variables: z.array(z.string()),
  isActive: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type Notification = z.infer<typeof NotificationSchema>;
export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type NotificationTemplate = z.infer<typeof NotificationTemplateSchema>;
export type NotificationType = z.infer<typeof NotificationTypeSchema>;
export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;
export type NotificationPriority = z.infer<typeof NotificationPrioritySchema>;
export type NotificationStatus = z.infer<typeof NotificationStatusSchema>;