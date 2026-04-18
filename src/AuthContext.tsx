import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { User } from './types';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
  verifyAge: (birthDate: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Check if user exists in Firestore
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        // Listen to user data in real-time
        const unsubscribeUser = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setUser(docSnap.data() as User);
          } else {
            // Create user if doesn't exist
            const isAdminEmail = firebaseUser.email === "rbvideos0441@gmail.com";
            const newUser: User = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || 'Viber',
              avatar: firebaseUser.photoURL || undefined,
              role: isAdminEmail ? 'admin' : 'viewer',
              coins: isAdminEmail ? 10000 : 0, 
              isAgeVerified: false,
              createdAt: Date.now(),
            };
            setDoc(userRef, newUser).catch(err => {
              handleFirestoreError(err, OperationType.CREATE, `users/${firebaseUser.uid}`);
            });
            setUser(newUser);
          }
          setLoading(false);
        }, (error) => {
          console.error("Firestore error in AuthContext:", error);
          // Don't throw here to avoid breaking the app state
          setLoading(false);
        });

        return () => unsubscribeUser();
      } else {
        setUser(null);
        setLoading(false);
      }
    }, (error) => {
      console.error("Auth state change error:", error);
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  const signIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('Bem-vindo ao VibeClub!');
    } catch (error) {
      console.error("Login error:", error);
      toast.error('Erro ao entrar com Google');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      toast.success('Até logo!');
    } catch (error) {
      toast.error('Erro ao sair');
    }
  };

  const verifyAge = async (birthDate: number) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.id), {
        birthDate,
        isAgeVerified: true
      }, { merge: true });
      toast.success('Idade verificada com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.id}`);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, logout, verifyAge }}>
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
