import { conciergeEngine } from '../conciergeEngine';
import type { ConciergeContext } from '../types';

const mockContext: ConciergeContext = {
  guestId: 'g-1',
  stayId: 's-1',
  hotelId: 'h-1',
  roomId: 'r-408',
  guestName: 'Alex Morgan',
  roomNumber: '408',
};

interface TestCase {
  id: number;
  input: string;
  expectedIntent: string;
  expectedDept?: string;
  expectedPriority?: string;
  expectedActionRequired: boolean;
  notes?: string;
}

const testCases: TestCase[] = [
  {
    id: 1,
    input: 'Do you have a gym?',
    expectedIntent: 'hotel_information',
    expectedActionRequired: false,
    notes: 'Knowledge query: fitness facilities',
  },
  {
    id: 2,
    input: 'Is there a swimming pool?',
    expectedIntent: 'hotel_information',
    expectedActionRequired: false,
    notes: 'Knowledge query: indoor & outdoor pools',
  },
  {
    id: 3,
    input: 'What restaurants are available?',
    expectedIntent: 'hotel_information',
    expectedActionRequired: false,
    notes: 'Knowledge query: 6 dining venues',
  },
  {
    id: 4,
    input: 'Do you have a spa?',
    expectedIntent: 'hotel_information',
    expectedActionRequired: false,
    notes: 'Knowledge query: Myoka 5 Senses Spa',
  },
  {
    id: 5,
    input: 'Is there a kids club?',
    expectedIntent: 'hotel_information',
    expectedActionRequired: false,
    notes: 'Knowledge query: DoubleTree Kids Club',
  },
  {
    id: 6,
    input: 'Where is the hotel located?',
    expectedIntent: 'hotel_information',
    expectedActionRequired: false,
    notes: 'Knowledge query: St. Pauls Bay, Qawra, Malta',
  },
  {
    id: 7,
    input: 'What time does breakfast start?',
    expectedIntent: 'hotel_information',
    expectedActionRequired: false,
    notes: 'Knowledge query with unconfigured hours: responds with honest disclaimer',
  },
  {
    id: 8,
    input: 'Can I book a massage?',
    expectedIntent: 'spa_request',
    expectedDept: 'Spa & Wellness',
    expectedActionRequired: true,
    notes: 'Actionable booking request: creates spa operational request',
  },
  {
    id: 9,
    input: 'Can I get two towels?',
    expectedIntent: 'housekeeping_request',
    expectedDept: 'Housekeeping',
    expectedPriority: 'Normal',
    expectedActionRequired: true,
    notes: 'Actionable housekeeping request: creates housekeeping request',
  },
  {
    id: 10,
    input: 'Can you book a restaurant for me?',
    expectedIntent: 'concierge_request',
    expectedDept: 'Concierge',
    expectedActionRequired: true,
    notes: 'Actionable concierge dining booking: routes to Concierge staff without fabricating completed booking',
  },
  {
    id: 11,
    input: 'The air conditioner is leaking water',
    expectedIntent: 'maintenance_request',
    expectedDept: 'Maintenance',
    expectedPriority: 'High',
    expectedActionRequired: true,
    notes: 'Urgent maintenance request: high priority',
  },
  {
    id: 12,
    input: 'Can you bring an adapter to my room?',
    expectedIntent: 'concierge_request',
    expectedDept: 'Concierge',
    expectedActionRequired: true,
    notes: 'Amenity request: routes to Concierge',
  },
  {
    id: 13,
    input: 'I need two extra pillows please',
    expectedIntent: 'housekeeping_request',
    expectedDept: 'Housekeeping',
    expectedActionRequired: true,
    notes: 'Bedding request: routes to Housekeeping',
  },
  {
    id: 14,
    input: 'Can someone bring a bottle of water?',
    expectedIntent: 'food_beverage_request',
    expectedDept: 'Food & Beverage',
    expectedActionRequired: true,
    notes: 'F&B room service request',
  },
  {
    id: 15,
    input: 'Can you send someone to help with our luggage?',
    expectedIntent: 'concierge_request',
    expectedDept: 'Concierge',
    expectedActionRequired: true,
    notes: 'Luggage assistance: routes to Concierge',
  },
];

async function runTests() {
  console.log('====================================================');
  console.log('DoubleTree Malta — AI Concierge Scenarios Test Suite');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    const analysis = await conciergeEngine.analyzeAndRespond(tc.input, mockContext);

    const intentMatch = analysis.intent === tc.expectedIntent;
    const actionMatch = analysis.actionRequired === tc.expectedActionRequired;
    const deptMatch = !tc.expectedDept || analysis.department === tc.expectedDept;
    const priorityMatch = !tc.expectedPriority || analysis.priority === tc.expectedPriority;

    const ok = intentMatch && actionMatch && deptMatch && priorityMatch;

    if (ok) {
      passed++;
      console.log(`✅ [Test ${tc.id}] "${tc.input}"`);
      console.log(`   Intent: ${analysis.intent} | Action: ${analysis.actionRequired}${analysis.department ? ` | Dept: ${analysis.department}` : ''}${analysis.priority ? ` | Priority: ${analysis.priority}` : ''}`);
      console.log(`   Response: "${analysis.response.slice(0, 90)}..."\n`);
    } else {
      failed++;
      console.error(`❌ [Test ${tc.id} FAILED] "${tc.input}"`);
      console.error(`   Expected: intent=${tc.expectedIntent}, action=${tc.expectedActionRequired}, dept=${tc.expectedDept}, priority=${tc.expectedPriority}`);
      console.error(`   Actual:   intent=${analysis.intent}, action=${analysis.actionRequired}, dept=${analysis.department}, priority=${analysis.priority}\n`);
    }
  }

  console.log('----------------------------------------------------');
  console.log(`Results: ${passed} passed, ${failed} failed (${passed}/${testCases.length})`);
  console.log('----------------------------------------------------');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
