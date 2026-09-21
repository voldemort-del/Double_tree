import type { ConciergeAnalysis, ConciergeContext, ConciergeProvider } from './types';
import { classifyIntent } from './intentClassifier';
import { extractRequestData } from './requestExtractor';
import { generateResponse } from './responseGenerator';

/**
 * Deterministic Concierge Engine for DoubleTree by Hilton Malta.
 * Implements the ConciergeProvider interface.
 * Can be swapped for an LLM provider (e.g. GeminiConciergeProvider)
 * in the future without changing the application or database layer.
 */
export class DeterministicConciergeProvider implements ConciergeProvider {
  async analyzeAndRespond(message: string, context: ConciergeContext): Promise<ConciergeAnalysis> {
    // 1. Classify Intent & Urgency
    const classified = classifyIntent(message, context);

    // 2. Extract Structured Operational Data
    const extracted = extractRequestData(message, classified, context);

    // 3. Generate Natural Hospitality Response
    const response = await generateResponse(message, classified, extracted, context);

    return {
      intent: classified.intent,
      department: extracted.department,
      priority: extracted.priority,
      title: extracted.title,
      description: extracted.description,
      actionRequired: extracted.actionRequired,
      confidence: classified.confidence,
      response,
      missingInformation: extracted.missingInformation,
      isExistingRequestAction: classified.intent === 'existing_request_action',
    };
  }
}

import { GeminiConciergeProvider } from './geminiProvider';

// Active provider instance (Gemini LLM by default with automatic deterministic fallback)
let activeProvider: ConciergeProvider = new GeminiConciergeProvider(new DeterministicConciergeProvider());

export function setConciergeProvider(provider: ConciergeProvider) {
  activeProvider = provider;
}

export function getConciergeProvider(): ConciergeProvider {
  return activeProvider;
}

export const conciergeEngine: ConciergeProvider = {
  analyzeAndRespond: (message: string, context: ConciergeContext) => {
    return activeProvider.analyzeAndRespond(message, context);
  },
};

/**
 * Convenience helper to process a message with the active engine
 */
export async function processConciergeMessage(
  message: string,
  context: ConciergeContext,
): Promise<ConciergeAnalysis> {
  return conciergeEngine.analyzeAndRespond(message, context);
}
