
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    role: string | null;
    name: string | null;
    loading: boolean;
    isAllowed: boolean;
    checkPermission: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    role: null,
    name: null,
    loading: true,
    isAllowed: false,
    checkPermission: async () => { },
    signOut: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAllowed, setIsAllowed] = useState(false);
    const [role, setRole] = useState<string | null>(null);
    const [name, setName] = useState<string | null>(null);

    useEffect(() => {
        // 1. Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session?.user) {
                checkUserAllowed(session.user.email);
            } else {
                setLoading(false);
            }
        });

        // 2. Listen for changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session?.user) {
                setLoading(true);
                checkUserAllowed(session.user.email);
            } else {
                setIsAllowed(false);
                setRole(null);
                setName(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const checkUserAllowed = async (email?: string) => {
        if (!email) {
            setIsAllowed(false);
            setLoading(false);
            return;
        }

        try {
            // Check 'allowed_users' table
            const { data, error } = await supabase
                .from('allowed_users')
                .select('email, role, name')
                .eq('email', email)
                .single();

            if (data) {
                setIsAllowed(true);
                setRole(data.role); // 'admin' or 'teacher'
                setName(data.name);
            } else {
                if (error) console.error('Allowed User Check Error:', error);
                console.warn('User not in allowed_users whitelist:', email);
                setIsAllowed(false);
                setRole(null);
            }
        } catch (e) {
            console.error('Permission check failed:', e);
            // Fallback
            setIsAllowed(false);
            setRole(null);
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setSession(null);
        setIsAllowed(false);
        setRole(null);
        setName(null);
    };

    return (
        <AuthContext.Provider value={{
            session,
            user: session?.user ?? null,
            role,
            name,
            loading,
            isAllowed,
            checkPermission: async () => {
                if (session?.user?.email) await checkUserAllowed(session.user.email);
            },
            signOut
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
