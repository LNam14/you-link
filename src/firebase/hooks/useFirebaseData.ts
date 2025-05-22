import { useEffect, useState } from 'react';
import { ref } from 'firebase/database';
import { database } from '@/lib/firebase';
import { listenToData, getDataSnapshot } from '../utils/firebaseUtils';
import { FirebaseError } from '../types';

export const useFirebaseData = <T>(path: string) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirebaseError | null>(null);

  useEffect(() => {
    const dbRef = ref(database, path);
    
    const unsubscribe = listenToData({
      ref: dbRef,
      callback: (snapshot) => {
        const value = getDataSnapshot(snapshot);
        setData(value);
        setLoading(false);
      },
      errorCallback: (error) => {
        setError(error);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [path]);

  return { data, loading, error };
}; 