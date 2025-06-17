import { useState, useEffect } from 'react';
import { User, signInWithPopup, signOut as firebaseSignOut, GoogleAuthProvider } from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { FirebaseError } from 'firebase/app';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      console.log('Auth state changed:', user ? `User logged in: ${user.email}` : 'No user');
      
      if (user) {
        // Check if user exists in Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (!userDoc.exists()) {
          // Create user document if it doesn't exist
          await setDoc(doc(db, 'users', user.uid), {
            email: user.email,
            name: user.displayName,
            photoURL: user.photoURL,
            createdAt: new Date(),
            lastLogin: new Date()
          });
          console.log('Created new user document in Firestore');
        } else {
          // Update last login
          await setDoc(doc(db, 'users', user.uid), {
            lastLogin: new Date()
          }, { merge: true });
          console.log('Updated user last login');
        }
      }
      
      setUser(user);
      setLoading(false);
      setError(null);
    }, (error) => {
      console.error('Auth state change error:', error);
      setError(error.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Starting Google sign in...');
      const result = await signInWithPopup(auth, googleProvider);
      console.log('Sign in successful:', result.user.email);
      return result;
    } catch (err: unknown) {
      console.error('Sign in error:', err);
      if (err instanceof FirebaseError) {
        setError(err.message);
        console.error('Firebase Error:', err.code, err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      setError(null);
      await firebaseSignOut(auth);
      console.log('Sign out successful');
    } catch (err: unknown) {
      if (err instanceof FirebaseError) {
        console.error('Firebase Error:', err.code, err.message);
        setError(err.message);
      } else if (err instanceof Error) {
        console.error('Sign out error:', err);
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    error,
    signIn,
    signOut,
  };
}; 