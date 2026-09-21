import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { ConciergeAnalysis, ConciergeContext, ConciergeProvider } from './types';
import { DeterministicConciergeProvider } from './conciergeEngine';

/**
 * Real LLM-powered Concierge Provider using Google Gemini API
 * through a secure Supabase Edge Function (`concierge-ai`).
 *
 * Privacy & Security:
 * - Browser NEVER calls Gemini directly or handles the Gemini API key.
 * - Authorized context is loaded server-side inside the Edge Function.
 * - Automatic, seamless fallback to DeterministicConciergeProvider if
 *   offline, unconfigured, or if Gemini returns an error or timeout.
 */
export class GeminiConciergeProvider implements ConciergeProvider {
  private fallbackProvider: ConciergeProvider;

  constructor(fallback?: ConciergeProvider) {
    this.fallbackProvider = fallback || new DeterministicConciergeProvider();
  }

  async analyzeAndRespond(
    message: string,
    context: ConciergeContext,
  ): Promise<ConciergeAnalysis> {
    // 1. If Supabase is not configured (demo/mock mode), use deterministic fallback directly
    if (!isSupabaseConfigured) {
      return this.fallbackProvider.analyzeAndRespond(message, context);
    }

    try {
      // 2. Call Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('concierge-ai', {
        body: {
          message,
          conversationId: context.conversationId || 'conv-1',
        },
      });

      if (error) {
        console.warn(
          '[GeminiConciergeProvider] Edge Function invocation failed, activating fallback:',
          error.message || error,
        );
        return this.fallbackProvider.analyzeAndRespond(message, context);
      }

      if (data?.fallbackRequired || !data?.success) {
        console.info(
          '[GeminiConciergeProvider] Edge Function requested fallback:',
          data?.error || 'Unknown status',
        );
        return this.fallbackProvider.analyzeAndRespond(message, context);
      }

      if (data?.analysis && typeof data.analysis.response === 'string') {
        const a = data.analysis;
        return {
          intent: a.intent || 'unknown',
          department: a.department || undefined,
          priority: a.priority || 'Normal',
          title: a.title || undefined,
          description: a.description || undefined,
          actionRequired: Boolean(a.actionRequired),
          confidence: typeof a.confidence === 'number' ? a.confidence : 0.95,
          response: a.response,
          missingInformation: Array.isArray(a.missingInformation) ? a.missingInformation : [],
          isExistingRequestAction: a.intent === 'existing_request_action',
          bookingDetails: a.bookingDetails ?? undefined,
        };
      }

      // Invalid response structure from Edge Function
      console.warn('[GeminiConciergeProvider] Unexpected response shape from Edge Function, activating fallback.');
      return this.fallbackProvider.analyzeAndRespond(message, context);
    } catch (err) {
      console.warn(
        '[GeminiConciergeProvider] Network error calling Edge Function, activating fallback:',
        err,
      );
      return this.fallbackProvider.analyzeAndRespond(message, context);
    }
  }
}
