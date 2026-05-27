/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query, where, getDoc, doc } from 'firebase/firestore';
import { auth, db } from './firebase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// Module-level persistent cache across component unmounts/renders
const globalUserCache = {};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Global cache state to trigger re-renders when a user display name updates
  const [userCache, setUserCache] = useState({});

  // Global states for instant SWR and single-subscription pages
  const [globalTickets, setGlobalTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [globalTodos, setGlobalTodos] = useState([]);
  const [globalUsers, setGlobalUsers] = useState([]);

  useEffect(() => {
    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            if (userData.uid === firebaseUser.uid) {
              setUser(userData);
            } else {
              localStorage.removeItem('user');
              setUser(null);
            }
          } catch (e) {
            localStorage.removeItem('user');
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
        localStorage.removeItem('user');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Set up a single application-level real-time listener for tickets
  useEffect(() => {
    if (!user) {
      setGlobalTickets([]);
      setTicketsLoading(false);
      return;
    }

    setTicketsLoading(true);
    let q;
    if (user.role === 'user') {
      q = query(collection(db, 'tickets'), where('created_by', '==', user.uid));
    } else {
      q = collection(db, 'tickets');
    }

    const unsubscribe = onSnapshot(q, (snap) => {
      const ticketsList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setGlobalTickets(ticketsList);
      setTicketsLoading(false);
    }, (error) => {
      console.error("Firestore real-time tickets sync error:", error);
      setTicketsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Stable function to resolve and cache user display names
  const fetchUser = useCallback(async (uid) => {
    if (!uid) return;
    if (globalUserCache[uid]) {
      if (globalUserCache[uid] !== 'loading') {
        setUserCache(prev => ({ ...prev, [uid]: globalUserCache[uid] }));
      }
      return;
    }

    globalUserCache[uid] = 'loading';
    try {
      const d = await getDoc(doc(db, 'users', uid));
      if (d.exists()) {
        const u = d.data();
        const displayName = u.username || u.email?.split('@')[0] || uid;
        globalUserCache[uid] = displayName;
        setUserCache(prev => ({ ...prev, [uid]: displayName }));
      } else {
        globalUserCache[uid] = uid;
        setUserCache(prev => ({ ...prev, [uid]: uid }));
      }
    } catch {
      delete globalUserCache[uid];
    }
  }, []);

  // Stable function to populate cache in bulk
  const populateCache = useCallback((usersList) => {
    if (!usersList || !Array.isArray(usersList)) return;
    let updated = false;
    usersList.forEach(u => {
      const uid = u.uid || u.firebaseUid;
      if (uid && !globalUserCache[uid]) {
        const displayName = u.username || u.email?.split('@')[0] || uid;
        globalUserCache[uid] = displayName;
        updated = true;
      }
    });
    if (updated) {
      setUserCache({ ...globalUserCache });
    }
  }, []);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      user, login, logout, loading,
      userCache, fetchUser, populateCache,
      globalTickets, ticketsLoading,
      globalTodos, setGlobalTodos,
      globalUsers, setGlobalUsers
    }}>
      {children}
    </AuthContext.Provider>
  );
};