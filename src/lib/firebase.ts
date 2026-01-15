// lib/firebase.ts
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
    apiKey: "AIzaSyD0ExhXCsNr_V_deefbKBV2uBDytkEtFQo",
      authDomain: "pocket-estimator-5c6a6.firebaseapp.com",
      projectId: "pocket-estimator-5c6a6",
      storageBucket: "pocket-estimator-5c6a6.firebasestorage.app",
      messagingSenderId: "933041576825",
      appId: "1:933041576825:web:838ea316bb6d50468fada8",
}

const app = initializeApp(firebaseConfig)

export const db = getFirestore(app)
export const storage = getStorage(app)