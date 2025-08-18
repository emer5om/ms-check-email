export interface Store {
  id: number;
  store_key: string;
  store_name: string;
  store_domain: string;
  webhook_url?: string;
  discord_bot_token?: string;
  kupfy_api_key?: string;
  reportana_api_key?: string;
  allcance_sms_key?: string;
  pix_key?: string;
  config?: Record<string, unknown>;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Payment {
  id: number;
  external_id: string;
  amount: number;
  status: string;
  customer_name: string;
  customer_email: string;
  customer_document: string;
  store_id?: number;
  created_at: Date;
  completed_at?: Date;
}

export interface PaymentSearchResult {
  payment: Payment | null;
  store: Store | null;
  found: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface StoreConfig {
  taxRate?: number;
  bonusRobux?: number;
  supportMessage?: string;
  refundPolicy?: string;
}

export interface PaymentData {
  id: string;
  customer_email: string;
  customer_name: string;
  amount: number;
  status: string;
  created_at: string;
  updated_at: string;
  store_id: string;
  metadata?: Record<string, unknown>;
}

export interface DiscordInteraction {
  id: string;
  type: number;
  data?: {
    custom_id?: string;
    component_type?: number;
    values?: string[];
  };
  guild_id?: string;
  channel_id?: string;
  member?: DiscordMember;
  user?: DiscordUser;
  token: string;
  version: number;
  message?: DiscordMessage;
}

export interface DiscordMember {
  user?: DiscordUser;
  nick?: string;
  roles: string[];
  joined_at: string;
  premium_since?: string;
  permissions?: string;
}

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
  bot?: boolean;
  system?: boolean;
  mfa_enabled?: boolean;
  verified?: boolean;
  email?: string;
}

export interface DiscordMessage {
  id: string;
  type: number;
  content: string;
  channel_id: string;
  author: DiscordUser;
  attachments: unknown[];
  embeds: unknown[];
  mentions: DiscordUser[];
  mention_roles: string[];
  pinned: boolean;
  mention_everyone: boolean;
  tts: boolean;
  timestamp: string;
  edited_timestamp?: string;
  flags?: number;
  components?: unknown[];
}