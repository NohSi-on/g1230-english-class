
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

interface StudentInfo {
    id: string;
    name: string;
    classIds: string[];
}

interface AuthContextType {
    session: Session | null;
    user: User | null;
    role: string | null;
    name: string | null;
    student: StudentInfo | null;
    loading: boolean;
    isAllowed: boolean;
    checkPermission: () => Promise<void>;
    signOut: () => Promise<void>;
    studentLogin: (name: string, last4Digits: string, classId?: string) => Promise<{ status: 'success' | 'ambiguous'; candidates?: any[] }>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    role: null,
    name: null,
    student: null,
    loading: true,
    isAllowed: false,
    checkPermission: async () => { },
    signOut: async () => { },
    studentLogin: async () => ({ status: 'success' }),
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAllowed, setIsAllowed] = useState(false);
    const [role, setRole] = useState<string | null>(null);
    const [name, setName] = useState<string | null>(null);
    const [student, setStudent] = useState<StudentInfo | null>(null);

    useEffect(() => {
        // 0. Check for persisted student session
        const persistedStudent = localStorage.getItem('g1230_student_session');
        if (persistedStudent) {
            try {
                const data = JSON.parse(persistedStudent);
                setStudent(data);
                setRole('student');
                setName(data.name);
                setIsAllowed(true);
                setLoading(false);
                return; // Prioritize student session if exists
            } catch (e) {
                localStorage.removeItem('g1230_student_session');
            }
        }

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
        if (role === 'student') {
            localStorage.removeItem('g1230_student_session');
            setStudent(null);
        } else {
            await supabase.auth.signOut();
        }
        setSession(null);
        setIsAllowed(false);
        setRole(null);
        setName(null);
    };

    const studentLogin = async (nameStr: string, last4Digits: string, classId?: string): Promise<{ status: 'success' | 'ambiguous'; candidates?: any[] }> => {
        setLoading(true);
        try {
            // 1. Query students with matching name
            // We'll filter by phone suffix in JS since it's easier than complex PG regex/substring for last 4
            const { data: students, error } = await supabase
                .from('students')
                .select('*')
                .eq('name', nameStr)
                .eq('status', 'ACTIVE');

            if (error) throw error;

            const matches = students.filter(s => {
                const phone = s.parent_phone || '';
                const cleanPhone = phone.replace(/-/g, '');
                return cleanPhone.endsWith(last4Digits);
            });

            if (matches.length === 0) {
                throw new Error('일치하는 학생 정보를 찾을 수 없습니다.');
            }

            let targetStudent = null;

            if (matches.length > 1 && !classId) {
                // Ambiguous - Fetch class names for candidates
                const candidates = await Promise.all(matches.map(async (s) => {
                    const { data: classData } = await supabase
                        .from('class_students')
                        .select('classes(name)')
                        .eq('student_id', s.id)
                        .limit(1)
                        .single();
                    return {
                        id: s.id,
                        name: s.name,
                        className: (classData?.classes as any)?.name || '소속 반 없음'
                    };
                }));
                return { status: 'ambiguous', candidates };
            }

            if (classId) {
                targetStudent = matches.find(s => s.id === classId); // Wait, if classId is provided, we should probably pass studentId here or refine
                // Actually if classId is passed, it means they picked a candidate. Let's assume classId passed is studentId for simplicity or re-query
                targetStudent = matches.find(s => s.id === classId);
            } else {
                targetStudent = matches[0];
            }

            if (!targetStudent) throw new Error('학생 정보를 확인할 수 없습니다.');

            // 2. Fetch class IDs
            const { data: classes } = await supabase
                .from('class_students')
                .select('class_id')
                .eq('student_id', targetStudent.id);

            const classIds = classes?.map(c => c.class_id) || [];

            const studentInfo: StudentInfo = {
                id: targetStudent.id,
                name: targetStudent.name,
                classIds
            };

            // 3. Set Session
            setStudent(studentInfo);
            setRole('student');
            setName(targetStudent.name);
            setIsAllowed(true);
            localStorage.setItem('g1230_student_session', JSON.stringify(studentInfo));

            return { status: 'success' };
        } catch (error: any) {
            console.error('Student login failed:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{
            session,
            user: session?.user ?? null,
            role,
            name,
            student,
            loading,
            isAllowed,
            checkPermission: async () => {
                if (session?.user?.email) await checkUserAllowed(session.user.email);
            },
            signOut,
            studentLogin
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
