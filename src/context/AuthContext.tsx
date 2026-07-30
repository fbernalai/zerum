import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { 
  auth, 
  subscribeToAuthChanges, 
  getUserProfileDoc, 
  logoutUser,
  loginAsGuestUser
} from '../lib/firebase';
import { UserProfileDoc } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfileDoc: UserProfileDoc | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  loginAsGuest: (name?: string, email?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userProfileDoc: null,
  loading: true,
  logout: async () => {},
  refreshUserProfile: async () => {},
  loginAsGuest: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfileDoc, setUserProfileDoc] = useState<UserProfileDoc | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string) => {
    try {
      const docData = await getUserProfileDoc(uid);
      setUserProfileDoc(docData);
    } catch (e) {
      console.error('Error fetching user profile context:', e);
    }
  };

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (user) => {
      if (user) {
        localStorage.removeItem('zerum_virtual_user');
        setCurrentUser(user);
        await fetchProfile(user.uid);
        setLoading(false);
      } else {
        const savedVirtual = localStorage.getItem('zerum_virtual_user');
        if (savedVirtual) {
          try {
            const parsed = JSON.parse(savedVirtual);
            if (parsed && parsed.uid) {
              setCurrentUser(parsed as User);
              await fetchProfile(parsed.uid);
              setLoading(false);
              return;
            }
          } catch (e) {
            console.error('Error reading virtual user:', e);
          }
        }
        setCurrentUser(null);
        setUserProfileDoc(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loginAsGuest = async (name?: string, email?: string) => {
    setLoading(true);
    const user = await loginAsGuestUser(name, email);
    setCurrentUser(user as User);
    if (user && user.uid) {
      await fetchProfile(user.uid);
    }
    setLoading(false);
  };

  const logout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setUserProfileDoc(null);
  };

  const refreshUserProfile = async () => {
    if (currentUser) {
      await fetchProfile(currentUser.uid);
    }
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      userProfileDoc,
      loading,
      logout,
      refreshUserProfile,
      loginAsGuest
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

