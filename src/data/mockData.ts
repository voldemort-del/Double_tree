import type {
  Guest,
  Staff,
  Room,
  Stay,
  HotelRequest,
  RequestEvent,
  Conversation,
  Message,
  SLARule,
  RequestCategory,
  RequestPriority,
} from '@/types';

// ============================================================
// Mock seed data for DoubleTree by Hilton Malta prototype.
// All data is fictional demo content unless noted otherwise.
// ============================================================

// ---- Rooms ----

export const rooms: Room[] = [
  { id: 'r-408', number: '408', floor: 4, type: 'Sea View King', view: 'Mediterranean Sea' },
  { id: 'r-212', number: '212', floor: 2, type: 'City View Queen', view: 'Qawra Promenade' },
  { id: 'r-317', number: '317', floor: 3, type: 'Sea View Twin', view: 'Mediterranean Sea' },
  { id: 'r-501', number: '501', floor: 5, type: 'Sea View King', view: 'Mediterranean Sea' },
  { id: 'r-224', number: '224', floor: 2, type: 'Garden View King', view: 'Pool Garden' },
  { id: 'r-310', number: '310', floor: 3, type: 'Sea View King', view: 'Mediterranean Sea' },
  { id: 'r-420', number: '420', floor: 4, type: 'Sea View Queen', view: 'Mediterranean Sea' },
];

export function roomByNumber(number: string): Room | undefined {
  return rooms.find((r) => r.number === number);
}

// ---- Stays ----

const now = new Date();
function daysFromNow(days: number): string {
  return new Date(now.getTime() + days * 86400000).toISOString();
}
function hoursAgo(h: number): string {
  return new Date(now.getTime() - h * 3600000).toISOString();
}
function minsAgo(m: number): string {
  return new Date(now.getTime() - m * 60000).toISOString();
}
function minsFromNow(m: number): string {
  return new Date(now.getTime() + m * 60000).toISOString();
}

export const stays: Stay[] = [
  {
    id: 's-1',
    guestId: 'g-1',
    roomId: 'r-408',
    checkIn: daysFromNow(-3),
    checkOut: daysFromNow(4),
    adults: 2,
    children: 0,
    status: 'active',
  },
  {
    id: 's-2',
    guestId: 'g-2',
    roomId: 'r-212',
    checkIn: daysFromNow(-1),
    checkOut: daysFromNow(5),
    adults: 1,
    children: 0,
    status: 'active',
  },
  {
    id: 's-3',
    guestId: 'g-3',
    roomId: 'r-317',
    checkIn: daysFromNow(-2),
    checkOut: daysFromNow(2),
    adults: 2,
    children: 1,
    status: 'active',
  },
];

// ---- Guests ----

export const guests: Guest[] = [
  {
    id: 'g-1',
    name: 'Alex Morgan',
    username: 'alex.morgan',
    roomNumber: '408',
    pin: '1234',
    avatarColor: 'bg-sea-600',
    stay: stays[0],
  },
  {
    id: 'g-2',
    name: 'Sarah Chen',
    username: 'sarah.chen',
    roomNumber: '212',
    pin: '1234',
    avatarColor: 'bg-sand-600',
    stay: stays[1],
  },
  {
    id: 'g-3',
    name: 'James Wilson',
    username: 'james.wilson',
    roomNumber: '317',
    pin: '1234',
    avatarColor: 'bg-teal-600',
    stay: stays[2],
  },
];

export function findGuest(username: string, roomNumber: string, pin: string): Guest | undefined {
  return guests.find(
    (g) =>
      g.username.toLowerCase() === username.toLowerCase() &&
      g.roomNumber === roomNumber &&
      g.pin === pin,
  );
}

// ---- Staff ----

export const staff: Staff[] = [
  {
    id: 'st-1',
    name: 'Maria Vella',
    username: 'staff',
    password: 'staff123',
    role: 'staff',
    department: 'Housekeeping',
    avatarColor: 'bg-sand-600',
  },
  {
    id: 'st-2',
    name: 'Daniel Zahra',
    username: 'staff2',
    password: 'staff123',
    role: 'staff',
    department: 'Maintenance',
    avatarColor: 'bg-orange-600',
  },
  {
    id: 'st-3',
    name: 'Lucia Grech',
    username: 'staff3',
    password: 'staff123',
    role: 'staff',
    department: 'Concierge',
    avatarColor: 'bg-purple-600',
  },
  {
    id: 'st-4',
    name: 'Antoine Caruana',
    username: 'manager',
    password: 'manager123',
    role: 'manager',
    department: 'Front Desk',
    avatarColor: 'bg-sea-700',
  },
];

export function findStaff(username: string, password: string): Staff | undefined {
  return staff.find(
    (s) => s.username === username && s.password === password,
  );
}

export function staffById(id: string): Staff | undefined {
  return staff.find((s) => s.id === id);
}

// ---- SLA rules ----

export const slaRules: SLARule[] = [
  { id: 'sla-1', category: 'Housekeeping', priority: 'Low', targetMinutes: 120 },
  { id: 'sla-2', category: 'Housekeeping', priority: 'Normal', targetMinutes: 60 },
  { id: 'sla-3', category: 'Housekeeping', priority: 'High', targetMinutes: 30 },
  { id: 'sla-4', category: 'Maintenance', priority: 'Normal', targetMinutes: 90 },
  { id: 'sla-5', category: 'Maintenance', priority: 'High', targetMinutes: 45 },
  { id: 'sla-6', category: 'Maintenance', priority: 'Urgent', targetMinutes: 20 },
  { id: 'sla-7', category: 'Room Service', priority: 'Normal', targetMinutes: 45 },
  { id: 'sla-8', category: 'Room Service', priority: 'High', targetMinutes: 30 },
  { id: 'sla-9', category: 'Concierge', priority: 'Normal', targetMinutes: 60 },
  { id: 'sla-10', category: 'Transportation', priority: 'Normal', targetMinutes: 90 },
  { id: 'sla-11', category: 'Spa & Wellness', priority: 'Normal', targetMinutes: 120 },
  { id: 'sla-12', category: 'Information', priority: 'Normal', targetMinutes: 15 },
];

export function slaForCategory(category: RequestCategory, priority: RequestPriority): number {
  const rule = slaRules.find((r) => r.category === category && r.priority === priority);
  return rule?.targetMinutes ?? 60;
}

// ---- Requests ----

export const initialRequests: HotelRequest[] = [
  {
    id: 'req-1048',
    shortId: '#1048',
    guestId: 'g-1',
    roomId: 'r-408',
    roomNumber: '408',
    conversationId: 'conv-1',
    title: 'Extra towels',
    description: 'Guest requested two additional towels for Room 408.',
    category: 'Housekeeping',
    department: 'Housekeeping',
    priority: 'Normal',
    status: 'Submitted',
    createdAt: minsAgo(8),
    slaTargetMinutes: 60,
    slaDeadline: minsFromNow(52),
  },
  {
    id: 'req-1049',
    shortId: '#1049',
    guestId: 'g-2',
    roomId: 'r-212',
    roomNumber: '212',
    title: 'Air conditioning not working',
    description: 'Guest reports that the air conditioning unit in Room 212 is not cooling.',
    category: 'Maintenance',
    department: 'Maintenance',
    priority: 'High',
    status: 'In Progress',
    assignedTo: 'st-2',
    createdAt: minsAgo(22),
    assignedAt: minsAgo(19),
    startedAt: minsAgo(14),
    slaTargetMinutes: 45,
    slaDeadline: minsFromNow(23),
  },
  {
    id: 'req-1050',
    shortId: '#1050',
    guestId: 'g-3',
    roomId: 'r-317',
    roomNumber: '317',
    title: 'Taxi to Valletta',
    description: 'Guest requests a taxi to Valletta for 7:00 PM.',
    category: 'Transportation',
    department: 'Concierge',
    priority: 'Normal',
    status: 'Assigned',
    assignedTo: 'st-3',
    createdAt: minsAgo(35),
    assignedAt: minsAgo(30),
    slaTargetMinutes: 90,
    slaDeadline: minsFromNow(55),
  },
  {
    id: 'req-1051',
    shortId: '#1051',
    guestId: 'g-1',
    roomId: 'r-408',
    roomNumber: '408',
    title: 'Room service — pasta & wine',
    description: 'Guest ordered spaghetti carbonara and a glass of house red wine.',
    category: 'Room Service',
    department: 'Food & Beverage',
    priority: 'Normal',
    status: 'Submitted',
    createdAt: minsAgo(3),
    slaTargetMinutes: 45,
    slaDeadline: minsFromNow(42),
  },
  {
    id: 'req-1052',
    shortId: '#1052',
    guestId: 'g-2',
    roomId: 'r-224',
    roomNumber: '224',
    title: 'Spa treatment request',
    description: 'Guest requests a 60-minute massage at Myoka Spa.',
    category: 'Spa & Wellness',
    department: 'Spa & Wellness',
    priority: 'Normal',
    status: 'Assigned',
    assignedTo: 'st-1',
    createdAt: minsAgo(45),
    assignedAt: minsAgo(38),
    slaTargetMinutes: 120,
    slaDeadline: minsFromNow(75),
  },
  {
    id: 'req-1046',
    shortId: '#1046',
    guestId: 'g-1',
    roomId: 'r-408',
    roomNumber: '408',
    title: 'Extra pillows',
    description: 'Guest requested two extra pillows.',
    category: 'Housekeeping',
    department: 'Housekeeping',
    priority: 'Low',
    status: 'Completed',
    assignedTo: 'st-1',
    createdAt: hoursAgo(5),
    assignedAt: hoursAgo(4.9),
    startedAt: hoursAgo(4.8),
    completedAt: hoursAgo(4.5),
    slaTargetMinutes: 120,
    slaDeadline: hoursAgo(3),
  },
  {
    id: 'req-1045',
    shortId: '#1045',
    guestId: 'g-1',
    roomId: 'r-408',
    roomNumber: '408',
    title: 'Late checkout request',
    description: 'Guest requested a late checkout at 2:00 PM.',
    category: 'Concierge',
    department: 'Concierge',
    priority: 'Normal',
    status: 'Completed',
    createdAt: hoursAgo(20),
    assignedAt: hoursAgo(19.9),
    startedAt: hoursAgo(19.5),
    completedAt: hoursAgo(18),
    slaTargetMinutes: 60,
    slaDeadline: hoursAgo(19),
  },
  {
    id: 'req-1043',
    shortId: '#1043',
    guestId: 'g-3',
    roomId: 'r-317',
    roomNumber: '317',
    title: 'Minibar restock',
    description: 'Guest requested minibar to be restocked with sparkling water and diet cola.',
    category: 'Housekeeping',
    department: 'Housekeeping',
    priority: 'Normal',
    status: 'Overdue',
    assignedTo: 'st-1',
    createdAt: hoursAgo(3),
    assignedAt: hoursAgo(2.9),
    slaTargetMinutes: 60,
    slaDeadline: minsAgo(115),
  },
  {
    id: 'req-1040',
    shortId: '#1040',
    guestId: 'g-2',
    roomId: 'r-212',
    roomNumber: '212',
    title: 'Breakfast in room',
    description: 'Continental breakfast for two, delivered to Room 212.',
    category: 'Room Service',
    department: 'Food & Beverage',
    priority: 'Normal',
    status: 'Completed',
    assignedTo: 'st-1',
    createdAt: hoursAgo(26),
    assignedAt: hoursAgo(25.9),
    startedAt: hoursAgo(25.5),
    completedAt: hoursAgo(25),
    slaTargetMinutes: 45,
    slaDeadline: hoursAgo(25.2),
  },
];

// ---- Request events ----

export const initialEvents: RequestEvent[] = [
  // #1048
  { id: 'e-1048-1', requestId: 'req-1048', eventType: 'created', actor: 'guest', actorName: 'Alex Morgan', timestamp: minsAgo(8), description: 'Request submitted' },
  { id: 'e-1048-2', requestId: 'req-1048', eventType: 'routed', actor: 'assistant', actorName: 'Concierge AI', timestamp: minsAgo(8), description: 'Sent to Housekeeping' },
  // #1049
  { id: 'e-1049-1', requestId: 'req-1049', eventType: 'created', actor: 'guest', actorName: 'Sarah Chen', timestamp: minsAgo(22), description: 'Request submitted' },
  { id: 'e-1049-2', requestId: 'req-1049', eventType: 'routed', actor: 'assistant', actorName: 'Concierge AI', timestamp: minsAgo(22), description: 'Sent to Maintenance' },
  { id: 'e-1049-3', requestId: 'req-1049', eventType: 'assigned', actor: 'staff', actorName: 'Daniel Zahra', timestamp: minsAgo(19), description: 'Daniel Zahra assigned' },
  { id: 'e-1049-4', requestId: 'req-1049', eventType: 'started', actor: 'staff', actorName: 'Daniel Zahra', timestamp: minsAgo(14), description: 'Request in progress' },
  // #1050
  { id: 'e-1050-1', requestId: 'req-1050', eventType: 'created', actor: 'guest', actorName: 'James Wilson', timestamp: minsAgo(35), description: 'Request submitted' },
  { id: 'e-1050-2', requestId: 'req-1050', eventType: 'routed', actor: 'assistant', actorName: 'Concierge AI', timestamp: minsAgo(35), description: 'Sent to Concierge' },
  { id: 'e-1050-3', requestId: 'req-1050', eventType: 'assigned', actor: 'staff', actorName: 'Antoine Caruana', timestamp: minsAgo(30), description: 'Lucia Grech assigned' },
  // #1052
  { id: 'e-1052-1', requestId: 'req-1052', eventType: 'created', actor: 'guest', actorName: 'Sarah Chen', timestamp: minsAgo(45), description: 'Request submitted' },
  { id: 'e-1052-2', requestId: 'req-1052', eventType: 'routed', actor: 'assistant', actorName: 'Concierge AI', timestamp: minsAgo(45), description: 'Sent to Spa & Wellness' },
  { id: 'e-1052-3', requestId: 'req-1052', eventType: 'assigned', actor: 'staff', actorName: 'Antoine Caruana', timestamp: minsAgo(38), description: 'Maria Vella assigned' },
  // #1046
  { id: 'e-1046-1', requestId: 'req-1046', eventType: 'created', actor: 'guest', actorName: 'Alex Morgan', timestamp: hoursAgo(5), description: 'Request submitted' },
  { id: 'e-1046-2', requestId: 'req-1046', eventType: 'routed', actor: 'assistant', actorName: 'Concierge AI', timestamp: hoursAgo(5), description: 'Sent to Housekeeping' },
  { id: 'e-1046-3', requestId: 'req-1046', eventType: 'assigned', actor: 'staff', actorName: 'Antoine Caruana', timestamp: hoursAgo(4.9), description: 'Maria Vella assigned' },
  { id: 'e-1046-4', requestId: 'req-1046', eventType: 'started', actor: 'staff', actorName: 'Maria Vella', timestamp: hoursAgo(4.8), description: 'Request in progress' },
  { id: 'e-1046-5', requestId: 'req-1046', eventType: 'completed', actor: 'staff', actorName: 'Maria Vella', timestamp: hoursAgo(4.5), description: 'Request completed' },
  // #1045
  { id: 'e-1045-1', requestId: 'req-1045', eventType: 'created', actor: 'guest', actorName: 'Alex Morgan', timestamp: hoursAgo(20), description: 'Request submitted' },
  { id: 'e-1045-2', requestId: 'req-1045', eventType: 'routed', actor: 'assistant', actorName: 'Concierge AI', timestamp: hoursAgo(20), description: 'Sent to Concierge' },
  { id: 'e-1045-3', requestId: 'req-1045', eventType: 'assigned', actor: 'staff', actorName: 'Antoine Caruana', timestamp: hoursAgo(19.9), description: 'Lucia Grech assigned' },
  { id: 'e-1045-4', requestId: 'req-1045', eventType: 'started', actor: 'staff', actorName: 'Lucia Grech', timestamp: hoursAgo(19.5), description: 'Request in progress' },
  { id: 'e-1045-5', requestId: 'req-1045', eventType: 'completed', actor: 'staff', actorName: 'Lucia Grech', timestamp: hoursAgo(18), description: 'Request completed' },
  // #1043
  { id: 'e-1043-1', requestId: 'req-1043', eventType: 'created', actor: 'guest', actorName: 'James Wilson', timestamp: hoursAgo(3), description: 'Request submitted' },
  { id: 'e-1043-2', requestId: 'req-1043', eventType: 'routed', actor: 'assistant', actorName: 'Concierge AI', timestamp: hoursAgo(3), description: 'Sent to Housekeeping' },
  { id: 'e-1043-3', requestId: 'req-1043', eventType: 'assigned', actor: 'staff', actorName: 'Antoine Caruana', timestamp: hoursAgo(2.9), description: 'Maria Vella assigned' },
  { id: 'e-1043-4', requestId: 'req-1043', eventType: 'escalated', actor: 'system', actorName: 'SLA Monitor', timestamp: minsAgo(115), description: 'SLA deadline passed — escalated' },
  // #1040
  { id: 'e-1040-1', requestId: 'req-1040', eventType: 'created', actor: 'guest', actorName: 'Sarah Chen', timestamp: hoursAgo(26), description: 'Request submitted' },
  { id: 'e-1040-2', requestId: 'req-1040', eventType: 'routed', actor: 'assistant', actorName: 'Concierge AI', timestamp: hoursAgo(26), description: 'Sent to Food & Beverage' },
  { id: 'e-1040-3', requestId: 'req-1040', eventType: 'assigned', actor: 'staff', actorName: 'Antoine Caruana', timestamp: hoursAgo(25.9), description: 'Maria Vella assigned' },
  { id: 'e-1040-4', requestId: 'req-1040', eventType: 'started', actor: 'staff', actorName: 'Maria Vella', timestamp: hoursAgo(25.5), description: 'Request in progress' },
  { id: 'e-1040-5', requestId: 'req-1040', eventType: 'completed', actor: 'staff', actorName: 'Maria Vella', timestamp: hoursAgo(25), description: 'Request completed' },
];

// ---- Conversations ----

const baseConv: Message[] = [
  {
    id: 'm-1',
    conversationId: 'conv-1',
    role: 'assistant',
    content: "Good evening, Alex. I'm your digital concierge for your stay at DoubleTree by Hilton Malta. How can I help you this evening?",
    timestamp: minsAgo(10),
  },
];

export const initialConversations: Conversation[] = [
  {
    id: 'conv-1',
    guestId: 'g-1',
    title: 'Concierge conversation',
    messages: baseConv,
    createdAt: minsAgo(10),
    lastActivityAt: minsAgo(8),
  },
];

export function conversationForGuest(guestId: string): Conversation | undefined {
  return initialConversations.find((c) => c.guestId === guestId);
}

// ---- Hotel info for guest dashboard ----

export const hotelInfo = {
  name: 'DoubleTree by Hilton Malta',
  location: 'Qawra, St. Paul\u2019s Bay, Malta',
  tagline: 'Mediterranean Seafront Resort',
  highlights: [
    { label: 'Private Beach', icon: 'Waves' },
    { label: '3 Swimming Pools', icon: 'Waves' },
    { label: 'Myoka Spa', icon: 'Sparkles' },
    { label: 'Kids\u2019 Club', icon: 'Sparkles' },
  ] as { label: string; icon: string }[],
  venues: [
    'Azure Restaurant & Terrace',
    'Ombre\u0301 Cafe\u0301 Bistro',
    'Juniper Lounge Bar',
    'Kora',
    'Sabi House',
    'Carvv Restaurant & Enoteca',
  ],
  breakfastHours: '7:00 AM \u2013 10:30 AM',
  nearby: 'Bu\u011fibba Bus Terminal',
};
