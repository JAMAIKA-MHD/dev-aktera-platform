/**
 * AuthContext — Global Authentication & Tenant State
 * ===================================================
 * Manages the Supabase session, the authenticated user, their profile,
 * and the organization they belong to. Exposed via `useAuth()` so any
 * component can read the current user/org or trigger sign-in / sign-up /
 * sign-out without re-fetching.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { toFriendlyErrorMessage } from '../lib/errorMessages';
import type { Profile, Organization } from '../types';

type AuthStatus = 'loading' | 'ready' | 'missing' | 'error';

/**
 * Shape of the context value consumed by `useAuth()`.
 */
interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  organization: Organization | null;
  loading: boolean;
  error: string | null;
  status: AuthStatus;
  hasRequiredTenantData: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const fetchProfileAndOrg = useCallback(async (userId: string, authEmail?: string | null) => {
    setError(null);

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching profile:', profileError.message);
      setProfile(null);
      setOrganization(null);
      setStatus('error');
      setError('We could not load your account profile. Please sign in again.');
      return;
    }

    if (!profileData) {
      setProfile(null);
      setOrganization(null);
      setStatus('missing');
      setError('Your account is missing its organization setup. Please complete onboarding again.');
      return;
    }

    let resolvedProfile = profileData as Profile;
    let syncWarning: string | null = null;
    const normalizedAuthEmail = authEmail?.trim().toLowerCase();

    if (normalizedAuthEmail && resolvedProfile.email.toLowerCase() !== normalizedAuthEmail) {
      const { error: syncError } = await supabase
        .from('profiles')
        .update({ email: normalizedAuthEmail })
        .eq('id', userId);

      if (syncError) {
        console.error('Error syncing profile email:', syncError.message);
        syncWarning = 'Your login email was updated, but syncing your profile email is still pending.';
      } else {
        resolvedProfile = {
          ...resolvedProfile,
          email: normalizedAuthEmail,
        };
      }
    }

    setProfile(resolvedProfile);

    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', (profileData as Profile).organization_id)
      .maybeSingle();

    if (orgError) {
      console.error('Error fetching organization:', orgError.message);
      setOrganization(null);
      setStatus('error');
      setError('We could not load your organization details. Please try again.');
      return;
    }

    if (!orgData) {
      setOrganization(null);
      setStatus('missing');
      setError('Your account is linked to an organization that could not be found.');
      return;
    }

    setOrganization(orgData as Organization);
    setStatus('ready');
    setError(syncWarning);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);

      if (data.session?.user) {
        fetchProfileAndOrg(data.session.user.id, data.session.user.email ?? null).finally(() => setLoading(false));
      } else {
        setStatus('ready');
        setError(null);
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setError(null);

      if (newSession?.user) {
        setLoading(true);
        void fetchProfileAndOrg(newSession.user.id, newSession.user.email ?? null).finally(() => setLoading(false));
      } else {
        setProfile(null);
        setOrganization(null);
        setStatus('ready');
        setError(null);
        setLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchProfileAndOrg]);

  const signIn = useCallback(async (email: string, password: string): Promise<string | null> => {
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      const friendlyError = toFriendlyErrorMessage(signInError, {
        fallback: 'Sign in failed. Please try again.',
      });
      setError(friendlyError);
      setStatus('error');
      return friendlyError;
    }

    return null;
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<string | null> => {
    setError(null);
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      const friendlyError = toFriendlyErrorMessage(signUpError, {
        fallback: 'Sign up failed. Please try again.',
      });
      setError(friendlyError);
      setStatus('error');
      return friendlyError;
    }

    return null;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setOrganization(null);
    setError(null);
    setStatus('ready');
    setLoading(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      setLoading(true);
      await fetchProfileAndOrg(user.id, user.email ?? null);
      setLoading(false);
    }
  }, [user, fetchProfileAndOrg]);

  const value: AuthContextValue = {
    session,
    user,
    profile,
    organization,
    loading,
    error,
    status,
    hasRequiredTenantData: status === 'ready' && Boolean(profile) && Boolean(organization),
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

export default AuthContext;
