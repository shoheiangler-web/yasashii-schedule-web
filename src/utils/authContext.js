import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  linkWithCredential,
  EmailAuthProvider,
  signOut,
} from 'firebase/auth';
import { auth } from './firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
      } else {
        // 未ログインなら匿名でサインイン
        try {
          await signInAnonymously(auth);
        } catch (e) {
          setUser(null);
        }
      }
    });
    return unsub;
  }, []);

  // 匿名アカウントにメール/パスワードを紐付け（複数デバイス同期用）
  async function linkEmail(email, password) {
    const credential = EmailAuthProvider.credential(email, password);
    const result = await linkWithCredential(auth.currentUser, credential);
    setUser(result.user);
    return result.user;
  }

  // メール/パスワードで新規登録
  async function registerEmail(email, password) {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    setUser(result.user);
    return result.user;
  }

  // メール/パスワードでサインイン
  async function loginEmail(email, password) {
    const result = await signInWithEmailAndPassword(auth, email, password);
    setUser(result.user);
    return result.user;
  }

  async function logout() {
    await signOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, linkEmail, registerEmail, loginEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
