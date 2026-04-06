import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import auth, {FirebaseAuthTypes} from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {configureFirebaseAuth} from '../services/firebase';

type UserRole = 'student' | 'teacher' | 'admin';

type UserProfile = {
  uid: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: 'active' | 'pending' | 'inactive';
};

type AuthContextType = {
  user: FirebaseAuthTypes.User | null;
  profile: UserProfile | null;
  fullName: string;
  role: UserRole;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  fullName: 'User',
  role: 'student',
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

function toCapitalizedName(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function getSeedFullName(user: FirebaseAuthTypes.User) {
  const fromDisplayName = user.displayName?.trim();
  if (fromDisplayName) {
    return toCapitalizedName(fromDisplayName);
  }

  const fromEmail = user.email?.split('@')[0] ?? 'user';
  return toCapitalizedName(fromEmail.replace(/[._-]+/g, ' '));
}

export function AuthProvider({children}: {children: React.ReactNode}) {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    configureFirebaseAuth();
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribe = auth().onAuthStateChanged(async nextUser => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      setUser(nextUser);

      if (!nextUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const ref = firestore().collection('users').doc(nextUser.uid);
        const seedName = getSeedFullName(nextUser);
        const snapshot = await ref.get();

        if (!snapshot.exists) {
          const bootstrap: UserProfile = {
            uid: nextUser.uid,
            email: nextUser.email ?? '',
            fullName: seedName,
            role: 'student',
            status: 'active',
          };
          await ref.set({
            ...bootstrap,
            createdAt: firestore.FieldValue.serverTimestamp(),
            updatedAt: firestore.FieldValue.serverTimestamp(),
          });
        }

        unsubscribeProfile = ref.onSnapshot(
          async profileSnapshot => {
            const data = profileSnapshot.data() as Partial<UserProfile> | undefined;
            const normalizedName = toCapitalizedName(data?.fullName || seedName || 'User');
            const nextProfile: UserProfile = {
              uid: data?.uid || nextUser.uid,
              email: data?.email || nextUser.email || '',
              fullName: normalizedName,
              role: (data?.role as UserRole) || 'student',
              status: data?.status || 'active',
            };

            if (!data?.fullName || data.fullName !== normalizedName) {
              await ref.set(
                {
                  fullName: normalizedName,
                  updatedAt: firestore.FieldValue.serverTimestamp(),
                },
                {merge: true},
              );
            }

            setProfile(nextProfile);
            setLoading(false);
          },
          error => {
            console.error('Failed to subscribe to user profile:', error);
            setProfile({
              uid: nextUser.uid,
              email: nextUser.email ?? '',
              fullName: seedName,
              role: 'student',
              status: 'active',
            });
            setLoading(false);
          },
        );
      } catch (error) {
        console.error('Failed to initialize user profile:', error);
        setProfile({
          uid: nextUser.uid,
          email: nextUser.email ?? '',
          fullName: getSeedFullName(nextUser),
          role: 'student',
          status: 'active',
        });
      } finally {
        setLoading(false);
      }
    });

    return () => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});
    const result = await GoogleSignin.signIn();
    const idToken = result.data?.idToken;

    if (!idToken) {
      throw new Error('Google sign-in did not return an idToken.');
    }

    const credential = auth.GoogleAuthProvider.credential(idToken);
    await auth().signInWithCredential(credential);
  };

  const signOutUser = async () => {
    await auth().signOut();
    await GoogleSignin.signOut();
  };

  const fullName = profile?.fullName || (user ? getSeedFullName(user) : 'User');
  const role = profile?.role || 'student';

  const value = useMemo(
    () => ({
      user,
      profile,
      fullName,
      role,
      loading,
      signInWithGoogle,
      signOut: signOutUser,
    }),
    [user, profile, fullName, role, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
