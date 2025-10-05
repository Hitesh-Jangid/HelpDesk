import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {

  apiKey: "AIzaSyDsSYgcS4gqbVkOelpBXxpn5YguC7AsN34",

  authDomain: "helpdesk-b8351.firebaseapp.com",

  databaseURL: "https://helpdesk-b8351-default-rtdb.asia-southeast1.firebasedatabase.app",

  projectId: "helpdesk-b8351",

  storageBucket: "helpdesk-b8351.firebasestorage.app",

  messagingSenderId: "71030808775",

  appId: "1:71030808775:web:b87d0652e256ddbfb89ee2",

  measurementId: "G-EXQVT9WHGS"

};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);