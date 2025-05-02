// src/firebase.js
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Replace with your project’s config (found in Firebase Console → Project settings)
const firebaseConfig = {
    apiKey: "AIzaSyCBoxOKvWCukcdOcxLKbm3k4Jw6fodxEg4",
    authDomain: "am4config.firebaseapp.com",
    databaseURL: "https://am4config-default-rtdb.firebaseio.com",
    projectId: "am4config",
    storageBucket: "am4config.firebasestorage.app",
    messagingSenderId: "502636116734",
    appId: "1:502636116734:web:3ea5124d5c597d013a03af"
};

// Initialize
const app = initializeApp(firebaseConfig);

// Export the Realtime Database instance
export const db = getDatabase(app);
