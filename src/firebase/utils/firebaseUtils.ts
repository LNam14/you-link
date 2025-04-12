import { ref, onValue, set, update, remove, DataSnapshot } from 'firebase/database';
import { database } from '../config/firebase';
import { FirebaseQueryOptions, FirebaseUpdateOptions, FirebaseError } from '../types';

export const listenToData = ({ ref, callback, errorCallback }: FirebaseQueryOptions) => {
  return onValue(ref, callback, (error: Error) => {
    console.error('Firebase data fetch error:', error);
    errorCallback?.({ code: error.name, message: error.message });
  });
};

export const updateData = async ({ ref, data, errorCallback }: FirebaseUpdateOptions) => {
  try {
    await update(ref, data);
  } catch (error) {
    console.error('Firebase update error:', error);
    errorCallback?.(error as FirebaseError);
  }
};

export const setData = async ({ ref, data, errorCallback }: FirebaseUpdateOptions) => {
  try {
    await set(ref, data);
  } catch (error) {
    console.error('Firebase set error:', error);
    errorCallback?.(error as FirebaseError);
  }
};

export const removeData = async (ref: FirebaseQueryOptions['ref'], errorCallback?: (error: FirebaseError) => void) => {
  try {
    await remove(ref);
  } catch (error) {
    console.error('Firebase remove error:', error);
    errorCallback?.(error as FirebaseError);
  }
};

export const getDataSnapshot = (snapshot: DataSnapshot) => {
  return snapshot.val();
}; 