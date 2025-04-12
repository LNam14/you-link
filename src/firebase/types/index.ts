import { DatabaseReference, DataSnapshot } from 'firebase/database';

export interface FirebaseData {
  [key: string]: any;
}

export interface FirebaseError {
  code: string;
  message: string;
}

export interface FirebaseQueryOptions {
  ref: DatabaseReference;
  callback: (snapshot: DataSnapshot) => void;
  errorCallback?: (error: FirebaseError) => void;
}

export interface FirebaseUpdateOptions {
  ref: DatabaseReference;
  data: FirebaseData;
  errorCallback?: (error: FirebaseError) => void;
} 