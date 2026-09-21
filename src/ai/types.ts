import type { Department, RequestPriority, HotelRequest, Message, Conversation } from '@/types';

export type ConciergeIntent =
  | 'hotel_information'
  | 'housekeeping_request'
  | 'maintenance_request'
  | 'food_beverage_request'
  | 'spa_request'
  | 'pool_recreation_request'
  | 'concierge_request'
  | 'complaint'
  | 'emergency'
  | 'general_conversation'
  | 'existing_request_action'
  | 'unknown';

export interface ConciergeContext {
  guestId: string;
  stayId: string;
  roomId: string;
  hotelId: string;
  guestName: string;
  roomNumber: string;
}

export interface ConciergeAnalysis {
  intent: ConciergeIntent;
  department?: Department;
  priority?: RequestPriority;
  title?: string;
  description?: string;
  actionRequired: boolean;
  confidence: number;
  response: string;
  missingInformation?: string[];
  isExistingRequestAction?: boolean;
}

export interface ConciergeResult {
  message: Message;
  analysis: ConciergeAnalysis;
  requestCreated: boolean;
  requestId?: string;
  request?: HotelRequest;
  conversation: Conversation;
}

export interface ConciergeProvider {
  analyzeAndRespond(message: string, context: ConciergeContext): Promise<ConciergeAnalysis>;
}
