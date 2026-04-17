export type UserRole = 'viewer' | 'host' | 'admin';

export interface BioPhoto {
  url: string;
  description: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  banner?: string;
  bio?: string;
  gallery?: BioPhoto[];
  role: UserRole;
  coins: number;
  createdAt: number;
}

export type LiveStatus = 'scheduled' | 'live' | 'ended';

export interface Live {
  id: string;
  hostId: string;
  hostName: string;
  hostAvatar?: string;
  title: string;
  description?: string;
  thumbnail?: string;
  status: LiveStatus;
  coinEntry: number;
  slotCost: number;
  viewerCount: number;
  startedAt?: number;
  endedAt?: number;
  createdAt: number;
  category: string;
}

export interface CoinPackage {
  id: string;
  name: string;
  coins: number;
  bonus: number;
  priceBrl: number;
  order?: number;
  isActive?: boolean;
}

export type TransactionType = 'purchase' | 'gift' | 'entry_fee' | 'slot_fee' | 'withdrawal' | 'bonus' | 'refund';

export interface CoinTransaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  description?: string;
  liveId?: string;
  toUserId?: string;
  stripePI?: string;
  createdAt: number;
}

export type AppStatus = 'pending' | 'approved' | 'rejected';

export interface HostApplication {
  id: string;
  userId: string;
  displayName: string;
  bio?: string;
  categories: string[];
  socialLink?: string;
  whyHost?: string;
  hasEquipment?: string;
  status: AppStatus;
  adminNote?: string;
  reviewedAt?: number;
  createdAt: number;
}
