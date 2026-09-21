// ============================================================
// Supabase Edge Function: concierge-ai
//
// LLM-powered hotel concierge for DoubleTree by Hilton Malta.
// Calls Google Gemini API with strict structured JSON output.
//
// Privacy & Security:
// - Never exposes GEMINI_API_KEY to browser/client code.
// - Resolves authorized guest, stay, room, and hotel context server-side.
// - Model produces structured intent/analysis; does NOT directly modify DB.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestPayload {
  message: string;
  conversationId: string;
}

interface ConciergeAnalysis {
  intent: string;
  department?: string | null;
  priority?: string | null;
  title?: string | null;
  description?: string | null;
  actionRequired: boolean;
  confidence: number;
  missingInformation?: string[];
  response: string;
  isExistingRequestAction?: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    const geminiModel = Deno.env.get('GEMINI_MODEL') || 'gemini-3.5-flash-lite';

    if (!geminiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          fallbackRequired: true,
          error: 'GEMINI_API_KEY is not configured in Edge Function secrets',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const payload: RequestPayload = await req.json();
    const { message, conversationId } = payload;

    if (!message || !conversationId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required parameters: message and conversationId are required',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 1. Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 2. Resolve verified context server-side
    // Query conversation
    const { data: conv } = await supabase
      .from('conversations')
      .select('id, guest_id, stay_id')
      .eq('id', conversationId)
      .maybeSingle();

    let guestName = 'Alex Morgan';
    let roomNumber = '408';
    let roomType = 'Sea View King';
    let hotelName = 'DoubleTree by Hilton Malta';
    let hotelLocation = 'Qawra, St Paul\'s Bay, Malta';
    let hotelId = 'a0000000-0000-0000-0000-000000000001';

    if (conv) {
      // Query guest
      const { data: guest } = await supabase
        .from('guests')
        .select('first_name, last_name, hotel_id')
        .eq('id', conv.guest_id)
        .maybeSingle();

      if (guest) {
        guestName = `${guest.first_name} ${guest.last_name}`;
        if (guest.hotel_id) hotelId = guest.hotel_id;
      }

      // Query stay & room
      const { data: stay } = await supabase
        .from('stays')
        .select('room_id')
        .eq('id', conv.stay_id)
        .maybeSingle();

      if (stay?.room_id) {
        const { data: room } = await supabase
          .from('rooms')
          .select('room_number, room_type')
          .eq('id', stay.room_id)
          .maybeSingle();

        if (room) {
          roomNumber = room.room_number;
          roomType = room.room_type;
        }
      }

      // Query hotel
      const { data: hotel } = await supabase
        .from('hotels')
        .select('name, location, address')
        .eq('id', hotelId)
        .maybeSingle();

      if (hotel) {
        hotelName = hotel.name;
        hotelLocation = hotel.location;
      }
    }

    // 3. Retrieve recent conversation history (last 8 messages)
    let recentMessages: { role: string; content: string }[] = [];
    if (conv) {
      const { data: dbMessages } = await supabase
        .from('messages')
        .select('sender_type, content, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(8);

      if (dbMessages && dbMessages.length > 0) {
        recentMessages = dbMessages
          .reverse()
          .map((m: any) => ({
            role: m.sender_type === 'guest' ? 'user' : 'model',
            content: m.content,
          }));
      }
    }

    // 4. Retrieve relevant hotel knowledge
    let knowledgeSnippets: string[] = [];
    const { data: knowledgeRows } = await supabase
      .from('hotel_knowledge')
      .select('category, title, content, keywords')
      .eq('hotel_id', hotelId);

    if (knowledgeRows && knowledgeRows.length > 0) {
      const lowerMsg = message.toLowerCase();
      const matched = knowledgeRows.filter((item: any) => {
        const titleMatch = item.title?.toLowerCase().includes(lowerMsg);
        const contentMatch = item.content?.toLowerCase().includes(lowerMsg);
        const catMatch = item.category?.toLowerCase().includes(lowerMsg);
        const kwMatch =
          Array.isArray(item.keywords) &&
          item.keywords.some((kw: string) => lowerMsg.includes(kw.toLowerCase()));
        return titleMatch || contentMatch || catMatch || kwMatch;
      });

      const selected = matched.length > 0 ? matched.slice(0, 5) : knowledgeRows.slice(0, 4);
      knowledgeSnippets = selected.map(
        (k: any) => `[${k.category} - ${k.title}]: ${k.content}`
      );
    } else {
      // Core verified hotel knowledge fallback
      knowledgeSnippets = [
        '[Hotel Identity]: DoubleTree by Hilton Malta is located along the seafront in Qawra, St Paul\'s Bay, Malta.',
        '[Facilities]: 3 outdoor pools, 1 indoor heated pool, fitness centre, Kids Club, private beach club access.',
        '[Dining]: 6 dining venues: Azure Restaurant & Terrace (buffet & Mediterranean), Osteria Tropea, Limonata Pool Bar, The Moorings, Beach Club Bar, and In-Room Dining.',
        '[Spa]: Myoka 5 Senses Spa offering massages, facials, and wellness body treatments.',
      ];
    }

    // 5. Build system prompt
    const systemPrompt = `You are the digital concierge for ${hotelName} in ${hotelLocation}.
You assist in-house guests with their stay, information, and room service/maintenance requests.

AUTHENTICATED GUEST CONTEXT:
- Guest Name: ${guestName}
- Room: ${roomNumber} (${roomType})
- Hotel: ${hotelName}, ${hotelLocation}

OFFICIAL HOTEL KNOWLEDGE (AUTHORITATIVE SOURCE OF TRUTH):
${knowledgeSnippets.join('\n')}

STRICT OPERATIONAL RULES:
1. Be concise, warm, polite, and hospitality-oriented.
2. Use ONLY the supplied hotel knowledge for factual hotel information.
3. NEVER invent or guess facts, opening hours, prices, or policies. If specific hours or pricing are not provided in the knowledge base, state politely that the exact schedule or pricing is not configured in the system and recommend checking with the Front Desk.
4. NEVER claim a booking or reservation is confirmed unless the application has created one.
5. NEVER claim an operational task has been completed; state that the request has been forwarded to the appropriate team.
6. NEVER ask the guest for their room number; you already know they are in Room ${roomNumber}.
7. For operational requests (extra towels, toiletries, maintenance, AC, plumbing, room service, spa booking inquiries, taxi transfers, luggage):
   - Set actionRequired: true
   - Set department to one of: "Front Desk", "Housekeeping", "Maintenance", "Food & Beverage", "Concierge", "Spa & Wellness", "Pool & Recreation"
   - Set priority to "Low", "Normal", "High", or "Urgent" (climate/plumbing faults are "High"; smoke/fire/gas/medical are "Urgent")
   - Formulate a clear, concise title and description
8. Missing Information: If an order or booking lacks essential details (e.g. food order without menu items, or a massage booking without preferred timing), list the missing items in missingInformation and ask a polite clarifying question in the response.
9. Emergencies: For smoke, fire, gas, or medical emergencies, advise immediate contact with emergency services (dial 112 in Malta) and alert the Front Desk. Set priority: "Urgent", department: "Front Desk", actionRequired: true.
10. Existing Request Action: If the guest wants to cancel or check status of a previous request, set intent: "existing_request_action" and actionRequired: false, directing them to check the Requests tab.
11. Return strictly a JSON object matching the requested schema.`;

    // 6. Build Gemini contents
    const contents: any[] = [];

    // Include recent conversational history (up to last 6 turns)
    for (const msg of recentMessages.slice(-6)) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      });
    }

    // Add current user message
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    // 7. Structured JSON response schema
    const responseSchema = {
      type: 'OBJECT',
      properties: {
        intent: {
          type: 'STRING',
          enum: [
            'hotel_information',
            'housekeeping_request',
            'maintenance_request',
            'food_beverage_request',
            'spa_request',
            'pool_recreation_request',
            'concierge_request',
            'complaint',
            'emergency',
            'general_conversation',
            'existing_request_action',
            'unknown',
          ],
        },
        department: {
          type: 'STRING',
          enum: [
            'Front Desk',
            'Housekeeping',
            'Maintenance',
            'Food & Beverage',
            'Concierge',
            'Spa & Wellness',
            'Pool & Recreation',
            'Management',
          ],
        },
        priority: {
          type: 'STRING',
          enum: ['Low', 'Normal', 'High', 'Urgent'],
        },
        title: { type: 'STRING' },
        description: { type: 'STRING' },
        actionRequired: { type: 'BOOLEAN' },
        confidence: { type: 'NUMBER' },
        missingInformation: {
          type: 'ARRAY',
          items: { type: 'STRING' },
        },
        response: { type: 'STRING' },
      },
      required: ['intent', 'actionRequired', 'confidence', 'response'],
    };

    // 8. Call Gemini REST API with 10-second timeout
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`;

    const geminiBody = {
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents,
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema,
      },
    };

    const abortCtrl = new AbortController();
    const timeoutId = setTimeout(() => abortCtrl.abort(), 10000);

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
      signal: abortCtrl.signal,
    });
    clearTimeout(timeoutId);

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.warn(`Gemini API error (${geminiRes.status}):`, errText);
      return new Response(
        JSON.stringify({
          success: false,
          fallbackRequired: true,
          error: `Gemini API returned status ${geminiRes.status}`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const geminiData = await geminiRes.json();
    const rawText =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    if (!rawText) {
      return new Response(
        JSON.stringify({
          success: false,
          fallbackRequired: true,
          error: 'Empty response from Gemini',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const parsed: ConciergeAnalysis = JSON.parse(rawText);

    // Normalize and validate
    const analysis: ConciergeAnalysis = {
      intent: parsed.intent || 'unknown',
      department: parsed.department || undefined,
      priority: parsed.priority || 'Normal',
      title: parsed.title || undefined,
      description: parsed.description || undefined,
      actionRequired: Boolean(parsed.actionRequired),
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.9,
      missingInformation: Array.isArray(parsed.missingInformation)
        ? parsed.missingInformation
        : [],
      response:
        parsed.response ||
        `Certainly, ${guestName.split(' ')[0]}. I've noted your request for Room ${roomNumber}.`,
      isExistingRequestAction: parsed.intent === 'existing_request_action',
    };

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('Edge Function unhandled exception:', err);
    return new Response(
      JSON.stringify({
        success: false,
        fallbackRequired: true,
        error: err?.message || 'Internal Edge Function error',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
