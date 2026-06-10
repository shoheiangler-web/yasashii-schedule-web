import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ⚠️ Firebase Consoleで作成したプロジェクトの設定値に書き換えてください
// https://console.firebase.google.com/ → プロジェクト設定 → マイアプリ → SDK設定
const firebaseConfig = {
  apiKey: 'AIzaSyBLq5xMc7Xxr_YC8JlHvuEM0vlXirbuMO4',
  authDomain: 'yasashii-schedule.firebaseapp.com',
  projectId: 'yasashii-schedule',
  storageBucket: 'yasashii-schedule.firebasestorage.app',
  messagingSenderId: '890497105263',
  appId: '1:890497105263:ios:2e172e1a1dbdb4ea78fc9a',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
