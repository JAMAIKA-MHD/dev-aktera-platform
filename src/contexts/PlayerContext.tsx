import React, { createContext, useContext, useState } from 'react';

// ── Shape of what the server returns from select-prize ──────────────────────

export interface ServerPrize {
  id: string;
  name: string;
  win_message: string | null;
}

export interface PlayerState {
  // Registration data
  playerName: string;
  phone: string;
  consentGiven: boolean;

  // Game result (populated after select-prize call)
  entryId: string | null;
  isWinner: boolean;
  prize: ServerPrize | null;
  couponCode: string | null;

  // Confirmation (populated after confirm-coupon call)
  couponConfirmed: boolean;

  // Current screen within the player flow
  screen: 'landing' | 'game' | 'result';
}

interface PlayerContextValue {
  state: PlayerState;
  setRegistration: (name: string, phone: string, consent: boolean) => void;
  setGameResult: (result: {
    entryId: string;
    isWinner: boolean;
    prize: ServerPrize | null;
    couponCode: string | null;
  }) => void;
  confirmCoupon: () => void;
  goToScreen: (screen: PlayerState['screen']) => void;
  resetFlow: () => void;
}

const INITIAL_STATE: PlayerState = {
  playerName: '',
  phone: '',
  consentGiven: false,
  entryId: null,
  isWinner: false,
  prize: null,
  couponCode: null,
  couponConfirmed: false,
  screen: 'landing',
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<PlayerState>(INITIAL_STATE);

  const setRegistration = (name: string, phone: string, consent: boolean) => {
    setState((prev) => ({ ...prev, playerName: name, phone, consentGiven: consent, screen: 'game' }));
  };

  const setGameResult = (result: {
    entryId: string;
    isWinner: boolean;
    prize: ServerPrize | null;
    couponCode: string | null;
  }) => {
    setState((prev) => ({
      ...prev,
      entryId: result.entryId,
      isWinner: result.isWinner,
      prize: result.prize,
      couponCode: result.couponCode,
      screen: 'result',
    }));
  };

  const confirmCoupon = () => {
    setState((prev) => ({ ...prev, couponConfirmed: true }));
  };

  const goToScreen = (screen: PlayerState['screen']) => {
    setState((prev) => ({ ...prev, screen }));
  };

  const resetFlow = () => {
    setState(INITIAL_STATE);
  };

  return (
    <PlayerContext.Provider value={{ state, setRegistration, setGameResult, confirmCoupon, goToScreen, resetFlow }}>
      {children}
    </PlayerContext.Provider>
  );
};

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside <PlayerProvider>');
  return ctx;
}
