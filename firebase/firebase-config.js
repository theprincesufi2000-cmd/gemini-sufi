import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  get,
  set,
  push,
  remove,
  update,
  serverTimestamp,
  query,
  orderByChild,
  limitToLast
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCUV26Yu0G0GkA05gUVQMKqWsoH1Szm45M",
  authDomain: "gemini-ff6e0.firebaseapp.com",
  databaseURL: "https://gemini-ff6e0-default-rtdb.firebaseio.com",
  projectId: "gemini-ff6e0",
  storageBucket: "gemini-ff6e0.firebasestorage.app",
  messagingSenderId: "33382194519",
  appId: "1:33382194519:android:2481de1b2308bb6d9b7212",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

export {
  app, auth, db, onAuthStateChanged,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, updateProfile, ref, get, set, push, remove, update,
  serverTimestamp, query, orderByChild, limitToLast
};
