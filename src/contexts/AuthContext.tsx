import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, Profile } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isClient: boolean;
  clientId: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let isInitialized = false;

    const timeout = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 2000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      isInitialized = true;
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    }).catch((error) => {
      if (!isMounted) return;
      console.error('Session fetch error:', error);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;

      if (_event === 'INITIAL_SESSION' || (_event === 'SIGNED_IN' && !isInitialized)) {
        return;
      }

      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setClientId(null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Profile fetch error:', error);
        setLoading(false);
        return;
      }

      console.log('Profile loaded:', data);
      setProfile(data);

      if (data?.role === 'client') {
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        console.log('Client lookup result:', { clientData, clientError });

        if (!clientError && clientData) {
          setClientId(clientData.id);
        } else {
          console.error('No client record found for user_id:', userId);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const isAdmin = profile?.role === 'admin';
  const isClient = profile?.role === 'client';

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut, isAdmin, isClient, clientId }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
