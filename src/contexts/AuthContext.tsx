import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// ── DB row shapes (snake_case, 1:1 with Postgres) ──────────────────────────

export interface DbProfile {
  id: string;
  organization_id: string;
  full_name: string;
  email: string;
  role: 'owner' | 'admin' | 'manager' | 'viewer';
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbOrganization {
  id: string;
  name: string;
  slug: string;
  contact_email: string;
  phone_number: string | null;
  logo_url: string | null;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── Context shape ───────────────────────────────────────────────────────────

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: DbProfile | null;
  organization: DbOrganization | null;
  loading: boolean;
  authError: string | null;
  needsOrganizationSetup: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [organization, setOrganization] = useState<DbOrganization | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [needsOrganizationSetup, setNeedsOrganizationSetup] = useState(false);

  /** Load profile + org for the authenticated user. */
  const loadProfileAndOrg = useCallback(async (userId: string) => {
    setAuthError(null);
    setNeedsOrganizationSetup(false);

    const { data: profileRow, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    const missingProfile = profileErr?.code === 'PGRST116' || !profileRow;

    if (missingProfile) {
      setProfile(null);
      setOrganization(null);
      setNeedsOrganizationSetup(true);
      return;
    }

    if (profileErr) {
      setProfile(null);
      setOrganization(null);
      setAuthError('We could not load your organization profile. Please refresh and try again.');
      return;
    }

    setProfile(profileRow as DbProfile);

    const { data: orgRow, error: orgErr } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', (profileRow as DbProfile).organization_id)
      .single();

    const missingOrganization = orgErr?.code === 'PGRST116' || !orgRow;

    if (missingOrganization) {
      setOrganization(null);
      setNeedsOrganizationSetup(true);
      return;
    }

    if (orgErr) {
      setOrganization(null);
      setAuthError('We could not load your organization details. Please refresh and try again.');
      return;
    }

    setOrganization(orgRow as DbOrganization | null);
  }, []);

  useEffect(() => {
    // Initialize from existing session
    supabase.auth.getSession().then(({ data }) => {
      const s = data.session;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadProfileAndOrg(s.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Subscribe to auth changes (login, logout, token refresh)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setLoading(true);
        loadProfileAndOrg(s.user.id).finally(() => setLoading(false));
      } else {
        setProfile(null);
        setOrganization(null);
        setAuthError(null);
        setNeedsOrganizationSetup(false);
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [loadProfileAndOrg]);

  const signIn = async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (!user?.id) return;
    setLoading(true);
    await loadProfileAndOrg(user.id);
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        organization,
        loading,
        authError,
        needsOrganizationSetup,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ── Hook ────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
