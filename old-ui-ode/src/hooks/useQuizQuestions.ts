/**
 * useQuizQuestions — Fetch all quiz questions for a given campaign.
 *
 * Used by the game screen when require_quiz is true. The RLS policy
 * allows anon reads of questions for active campaigns.
 */

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toFriendlyErrorMessage } from '../lib/errorMessages';
import type { QuizQuestion } from '../types';

/** Return type of the hook. */
interface UseQuizQuestionsResult {
  /** Array of quiz questions, ordered by position. */
  questions: QuizQuestion[];
  /** True while the query is in flight. */
  loading: boolean;
  /** Error message if the query failed, null otherwise. */
  error: string | null;
}

/**
 * @param campaignId - The campaign UUID. When null/undefined, returns
 *                     an empty array with no error.
 */
export function useQuizQuestions(campaignId: string | null | undefined): UseQuizQuestionsResult {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId) {
      setQuestions([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const fetchQuestions = async () => {
      const { data, error: queryError } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('is_active', true)
        .order('position', { ascending: true });

      if (cancelled) return;

      if (queryError) {
        setError(
          toFriendlyErrorMessage(queryError, {
            fallback: 'Failed to load quiz questions. Please try again.',
          }),
        );
        setQuestions([]);
      } else {
        setError(null);
        setQuestions((data as QuizQuestion[]) ?? []);
      }
      setLoading(false);
    };

    fetchQuestions();

    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  return { questions, loading, error };
}

export default useQuizQuestions;
