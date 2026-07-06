/**
 * PlayerContext — Public Player Session State
 * ===========================================
 * Manages the participant's identity and consent across the public
 * play flow (landing → game → result). Unlike AuthContext, this is for
 * *unauthenticated* players who submit entries via the public route.
 *
 * State persists in sessionStorage so a page refresh during a play
 * session doesn't lose the player's name/phone, but the data is cleared
 * when the tab closes (unlike localStorage, which would persist across
 * sessions and leak PII).
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';

/**
 * The player's identity and consent collected during the play flow.
 */
interface PlayerState {
  /** Participant's full name, collected on the landing page. */
  name: string;
  /** Participant's phone number (Algerian format). */
  phone: string;
  /** Participant's email, optional. */
  email: string;
  /** Whether the player consented to the terms/privacy policy. */
  consent: boolean;
  /** The campaign slug the player is currently playing. */
  campaignSlug: string | null;
  /** Whether the player has completed the quiz (if applicable). */
  quizCompleted: boolean;
  /** Whether the player won a prize in the current play. */
  hasWon: boolean;
  /** The name of the prize won, if any. */
  prizeName: string | null;
  /** The ID of the entry created for this play session (for coupon confirmation). */
  entryId: string | null;
  /** The ID of the prize won (for coupon lookup). */
  prizeId: string | null;
  /** The coupon/voucher code to redeem (for voucher prizes). */
  couponCode: string | null;
  /** Whether the player has confirmed redemption of the coupon. */
  couponRedeemed: boolean;
}

/**
 * Shape of the context value consumed by `usePlayer()`.
 */
interface PlayerContextValue extends PlayerState {
  /** Update one or more player fields at once. */
  setPlayer: (partial: Partial<PlayerState>) => void;
  /** Reset all player state (called on result screen or when leaving). */
  resetPlayer: () => void;
}

/** The React context instance. */
const PlayerContext = createContext<PlayerContextValue | undefined>(undefined);

/** Key used to persist player state in sessionStorage. */
const STORAGE_KEY = 'dzengage_player';

/** The initial empty player state. */
const initialState: PlayerState = {
  name: '',
  phone: '',
  email: '',
  consent: false,
  campaignSlug: null,
  quizCompleted: false,
  hasWon: false,
  prizeName: null,
  entryId: null,
  prizeId: null,
  couponCode: null,
  couponRedeemed: false,
};

/**
 * PlayerProvider wraps the public play routes and keeps the player's
 * identity and game state in sync with sessionStorage.
 */
export function PlayerProvider({ children }: { children: ReactNode }) {
  const [playerState, setPlayerState] = useState<PlayerState>(() => {
    // On mount, try to restore from sessionStorage so a refresh during
    // a play session doesn't lose the player's data.
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...initialState, ...JSON.parse(stored) };
      }
    } catch {
      // If sessionStorage is unavailable or the JSON is corrupt, start fresh.
    }
    return initialState;
  });

  // Persist to sessionStorage on every state change.
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(playerState));
    } catch {
      // Ignore write failures (e.g. private mode quota exceeded).
    }
  }, [playerState]);

  /**
   * Merge partial fields into the player state.
   */
  const setPlayer = useCallback((partial: Partial<PlayerState>) => {
    setPlayerState((prev) => ({ ...prev, ...partial }));
  }, []);

  /**
   * Reset all player state to the initial empty values.
   * Also clears sessionStorage so the next play starts clean.
   */
  const resetPlayer = useCallback(() => {
    setPlayerState(initialState);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore removal failures.
    }
  }, []);

  const value: PlayerContextValue = {
    ...playerState,
    setPlayer,
    resetPlayer,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

/**
 * Convenience hook to access the player context.
 * Throws if used outside of a `PlayerProvider`.
 */
export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (ctx === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return ctx;
}

export default PlayerContext;
