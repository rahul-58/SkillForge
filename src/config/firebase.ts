import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAZfEskokyOhvpZMxPt4U9ESxj2tboSTl4",
  authDomain: "skillforge-3a939.firebaseapp.com",
  projectId: "skillforge-3a939",
  storageBucket: "skillforge-3a939.appspot.com",
  messagingSenderId: "110768517551145826935",
  appId: "1:110768517551145826935:web:1234567890abcdef"
};

// Debug Firebase configuration
console.log('Firebase Config:', firebaseConfig);

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

// Enable offline persistence
enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.warn('The current browser does not support persistence.');
    }
  });

export { auth, db, storage, googleProvider };

export default app; 