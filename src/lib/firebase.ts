/// <reference types="vite/client" />
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { UserProfileDoc, OnboardingAnswers } from '../types';


// Configuration from environment variables or applet config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const hasFirebase = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
if (!hasFirebase) {
  console.error('[ZERUM] Faltan variables VITE_FIREBASE_* — corriendo solo en local.');
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID;
export const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);

// ----------------------------------------------------
// FIREBASE AUTHENTICATION SERVICES
// ----------------------------------------------------

/**
 * Guest / Demo Login Fallback
 */
export async function loginAsGuestUser(nombreParam?: string, emailParam?: string) {
  let user: any = null;
  let uid = '';

  try {
    const { signInAnonymously } = await import('firebase/auth');
    const cred = await signInAnonymously(auth);
    user = cred.user;
    uid = user.uid;
  } catch (authErr) {
    console.warn('Anonymous sign in not available/allowed, using virtual guest session:', authErr);
    uid = 'guest_' + (emailParam ? emailParam.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'zerum_demo');
    user = {
      uid,
      email: emailParam || 'demo@zerum.app',
      displayName: nombreParam || 'Usuario Demo',
      isVirtual: true
    };
  }

  const now = new Date().toISOString();
  const guestDoc: UserProfileDoc = {
    uid,
    nombre: nombreParam || user.displayName || 'Usuario Demo',
    correo: emailParam || user.email || `demo_${uid.slice(0, 6)}@zerum.app`,
    rol: (emailParam && emailParam.toLowerCase().includes('admin')) ? 'admin' : 'usuario',
    pais: 'México',
    moneda: 'MXN',
    tipoIngreso: 'quincenal',
    frecuenciaIngreso: 'quincenal',
    ingresoPromedio: 25000,
    objetivoPrincipal: 'salir_deudas',
    fechaRegistro: now,
    ultimaConexion: now,
    onboardingCompletado: true
  };

  // Cache in localStorage
  localStorage.setItem(`zerum_profile_${uid}`, JSON.stringify(guestDoc));

  // Attempt Firestore sync if online
  try {
    const docRef = doc(db, 'usuarios', uid);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      await setDoc(docRef, guestDoc, { merge: true });
    } else {
      await setDoc(docRef, { ultimaConexion: now }, { merge: true });
    }
  } catch (e) {
    console.warn('Firestore user doc sync skipped (offline or network error):', e);
  }

  if (user.isVirtual) {
    localStorage.setItem('zerum_virtual_user', JSON.stringify(user));
  }

  return user;
}

/**
 * Register new user with Email & Password
 */
export async function signUpWithEmail(email: string, pass: string, nombre: string) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const user = userCredential.user;
    
    await updateProfile(user, { displayName: nombre });

    // Initialize User Document in usuarios/{uid}
    const now = new Date().toISOString();
    const initialUserDoc: UserProfileDoc = {
      uid: user.uid,
      nombre: nombre || 'Usuario Zerum',
      correo: user.email || email,
      rol: email.toLowerCase().includes('admin@zerum.app') ? 'admin' : 'usuario',
      pais: 'México',
      moneda: 'MXN',
      tipoIngreso: 'quincenal',
      frecuenciaIngreso: 'quincenal',
      ingresoPromedio: 0,
      objetivoPrincipal: 'salir_deudas',
      fechaRegistro: now,
      ultimaConexion: now,
      onboardingCompletado: false
    };

    localStorage.setItem(`zerum_profile_${user.uid}`, JSON.stringify(initialUserDoc));

    try {
      await setDoc(doc(db, 'usuarios', user.uid), initialUserDoc, { merge: true });
    } catch (dbErr) {
      console.warn('Could not save user profile to Firestore immediately:', dbErr);
    }
    return user;
  } catch (err: any) {
    if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/network-request-failed') {
      console.warn('Auth restriction/offline detected. Switching to guest/demo mode.');
      return await loginAsGuestUser(nombre, email);
    }
    throw err;
  }
}

/**
 * Sign in existing user with Email & Password
 */
export async function loginWithEmail(email: string, pass: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    const user = userCredential.user;

    // Update last connection date
    try {
      await updateDoc(doc(db, 'usuarios', user.uid), {
        ultimaConexion: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Could not update last connection time:', e);
    }

    return user;
  } catch (err: any) {
    if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/network-request-failed') {
      console.warn('Auth restriction/offline detected. Switching to guest/demo mode.');
      return await loginAsGuestUser(email.split('@')[0] || 'Usuario Zerum', email);
    }
    throw err;
  }
}

/**
 * Sign in with Google Account
 */
export async function loginWithGoogle() {
  localStorage.removeItem('zerum_virtual_user');
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;

    const now = new Date().toISOString();
    const userDocRef = doc(db, 'usuarios', user.uid);

    let rawName = user.displayName;
    if (!rawName && user.email) {
      const parts = user.email.split('@')[0].split('.');
      rawName = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    }
    const finalName = rawName || 'Usuario';
    const userEmail = user.email || '';

    let existingDoc: UserProfileDoc | null = null;
    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        existingDoc = snap.data() as UserProfileDoc;
      }
    } catch (e) {
      console.warn('Error checking user doc existence:', e);
    }

    if (!existingDoc) {
      const initialUserDoc: UserProfileDoc = {
        uid: user.uid,
        nombre: finalName,
        correo: userEmail,
        rol: (userEmail && userEmail.toLowerCase().includes('admin')) ? 'admin' : 'usuario',
        pais: 'México',
        moneda: 'MXN',
        tipoIngreso: 'quincenal',
        frecuenciaIngreso: 'quincenal',
        ingresoPromedio: 0,
        objetivoPrincipal: 'salir_deudas',
        fechaRegistro: now,
        ultimaConexion: now,
        onboardingCompletado: false
      };
      localStorage.setItem(`zerum_profile_${user.uid}`, JSON.stringify(initialUserDoc));
      try {
        await setDoc(userDocRef, initialUserDoc, { merge: true });
      } catch (dbErr) {
        console.warn('Could not save google user profile to Firestore:', dbErr);
      }
    } else {
      const updatedDoc = {
        ...existingDoc,
        nombre: (existingDoc.nombre && existingDoc.nombre !== 'Usuario Demo') ? existingDoc.nombre : finalName,
        correo: userEmail,
        ultimaConexion: now
      };
      localStorage.setItem(`zerum_profile_${user.uid}`, JSON.stringify(updatedDoc));
      try {
        await updateDoc(userDocRef, { 
          nombre: updatedDoc.nombre,
          correo: userEmail,
          ultimaConexion: now 
        });
      } catch (e) {
        console.warn('Could not update connection time:', e);
      }
    }

    return user;
  } catch (err: any) {
    console.error('Google Auth error:', err);
    throw err;
  }
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string) {
  return await sendPasswordResetEmail(auth, email);
}

/**
 * Logout current user
 */
export async function logoutUser() {
  localStorage.removeItem('zerum_virtual_user');
  try {
    await signOut(auth);
  } catch (e) {
    console.warn('SignOut error or virtual session cleared:', e);
  }
}

/**
 * Subscribe to Auth state changes
 */
export function subscribeToAuthChanges(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// ----------------------------------------------------
// FIRESTORE USER PROFILE & ONBOARDING SERVICES
// ----------------------------------------------------

/**
 * Fetch User Root Profile Document
 */
export async function getUserProfileDoc(uid: string): Promise<UserProfileDoc | null> {
  const localProfStr = localStorage.getItem(`zerum_profile_${uid}`);
  let localDoc: UserProfileDoc | null = null;
  if (localProfStr) {
    try { localDoc = JSON.parse(localProfStr); } catch (e) {}
  }

  try {
    const docRef = doc(db, 'usuarios', uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as UserProfileDoc;
      localStorage.setItem(`zerum_profile_${uid}`, JSON.stringify(data));
      return data;
    }
  } catch (e) {
    console.warn('Error fetching user profile doc from Firestore, using local fallback:', e);
  }

  if (localDoc) return localDoc;

  // If uid is a guest or virtual user, create an in-memory profile doc
  const currentAuthUser = auth.currentUser;
  const now = new Date().toISOString();

  let name = 'Usuario Zerum';
  let email = 'usuario@zerum.app';

  if (currentAuthUser && currentAuthUser.uid === uid) {
    if (currentAuthUser.displayName) {
      name = currentAuthUser.displayName;
    } else if (currentAuthUser.email) {
      const parts = currentAuthUser.email.split('@')[0].split('.');
      name = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
      email = currentAuthUser.email;
    }
  } else if (uid.startsWith('guest_') || uid.startsWith('demo_')) {
    name = 'Usuario Demo';
    email = 'demo@zerum.app';
  }

  const fallbackDoc: UserProfileDoc = {
    uid,
    nombre: name,
    correo: email,
    rol: (email.includes('admin') || uid.includes('admin')) ? 'admin' : 'usuario',
    pais: 'México',
    moneda: 'MXN',
    tipoIngreso: 'quincenal',
    frecuenciaIngreso: 'quincenal',
    ingresoPromedio: 25000,
    objetivoPrincipal: 'salir_deudas',
    fechaRegistro: now,
    ultimaConexion: now,
    onboardingCompletado: true
  };
  localStorage.setItem(`zerum_profile_${uid}`, JSON.stringify(fallbackDoc));
  return fallbackDoc;
}

/**
 * Update User Root Profile Document
 */
export async function updateUserProfileDoc(uid: string, data: Partial<UserProfileDoc>) {
  const localProfStr = localStorage.getItem(`zerum_profile_${uid}`);
  if (localProfStr) {
    try {
      const existing = JSON.parse(localProfStr);
      localStorage.setItem(`zerum_profile_${uid}`, JSON.stringify({ ...existing, ...data }));
    } catch (e) {}
  }

  try {
    const docRef = doc(db, 'usuarios', uid);
    await setDoc(docRef, data, { merge: true });
  } catch (e) {
    console.warn('Could not update Firestore profile doc:', e);
  }
}

/**
 * Complete Onboarding for user
 */
export async function saveUserOnboardingData(uid: string, answers: OnboardingAnswers) {
  const updatePayload = {
    nombre: answers.nombre || 'Usuario Zerum',
    pais: answers.pais || 'México',
    moneda: answers.moneda || 'MXN',
    tipoIngreso: answers.tipoIngreso || 'fijo',
    frecuenciaIngreso: answers.frecuenciaIngreso || 'quincenal',
    ingresoPromedio: Number(answers.ingresoPromedio) || 0,
    objetivoPrincipal: answers.objetivoPrincipal || 'salir_deudas',
    onboardingCompletado: true,
    onboardingData: answers,
    ultimaConexion: new Date().toISOString()
  };

  const localProfStr = localStorage.getItem(`zerum_profile_${uid}`);
  if (localProfStr) {
    try {
      const existing = JSON.parse(localProfStr);
      localStorage.setItem(`zerum_profile_${uid}`, JSON.stringify({ ...existing, ...updatePayload }));
    } catch (e) {}
  }

  try {
    const docRef = doc(db, 'usuarios', uid);
    await setDoc(docRef, updatePayload, { merge: true });

    // Populate initial reference income if provided and no existing income records
    if (answers.ingresoPromedio && answers.ingresoPromedio > 0) {
      try {
        const ingresosCol = collection(db, 'usuarios', uid, 'ingresos');
        const snap = await getDocs(ingresosCol);
        if (snap.empty) {
          const freqLabel = answers.frecuenciaIngreso === 'semanal' ? 'Semanal' : answers.frecuenciaIngreso === 'quincenal' ? 'Quincenal' : 'Mensual';
          await addUserSubcolDoc(uid, 'ingresos', {
            concepto: `Ingreso ${freqLabel} Principal`,
            monto: Number(answers.ingresoPromedio),
            montoPeriodico: Number(answers.ingresoPromedio),
            frecuencia: answers.frecuenciaIngreso || 'quincenal',
            tipo: answers.tipoIngreso || 'fijo',
            fechaCobro: 15,
            comentario: 'Registrado en la Fragua al momento del alta'
          });
        }
      } catch (err) {
        console.warn('Notice: Could not auto-populate reference income in Firestore:', err);
      }
    }
  } catch (e) {
    console.warn('Could not save onboarding data to Firestore:', e);
  }
}

// ----------------------------------------------------
// FIRESTORE SUBCOLLECTIONS SERVICES (Multi-Tenant)
// usuarios/{uid}/{subcolName}
// ----------------------------------------------------

/**
 * Subscribe to real-time updates for a user subcollection
 */
export function subscribeUserSubcollection<T>(
  uid: string,
  subcolName: string,
  onData: (items: T[]) => void
) {
  if (!uid) return () => {};

  const localKey = `zerum_subcol_${uid}_${subcolName}`;
  const localData = localStorage.getItem(localKey);
  if (localData) {
    try {
      onData(JSON.parse(localData));
    } catch (e) {}
  }

  try {
    const colRef = collection(db, 'usuarios', uid, subcolName);
    return onSnapshot(colRef, (snapshot) => {
      const list: T[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as T);
      });
      localStorage.setItem(localKey, JSON.stringify(list));
      onData(list);
    }, (err) => {
      console.warn(`Firestore snapshot notice for ${subcolName} (using local cache):`, err.message || err);
      const cached = localStorage.getItem(localKey);
      if (cached) {
        try { onData(JSON.parse(cached)); } catch (e) {}
      }
    });
  } catch (err) {
    console.warn(`Failed to set up listener for ${subcolName}, returning offline cache:`, err);
    return () => {};
  }
}

/**
 * Add document to user subcollection
 */
export async function addUserSubcolDoc(uid: string, subcolName: string, data: any) {
  const localKey = `zerum_subcol_${uid}_${subcolName}`;
  const newId = 'doc_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
  const newItem = { id: newId, ...data, createdAt: new Date().toISOString() };

  try {
    const existing = localStorage.getItem(localKey);
    const list = existing ? JSON.parse(existing) : [];
    list.push(newItem);
    localStorage.setItem(localKey, JSON.stringify(list));
  } catch (e) {}

  try {
    const colRef = collection(db, 'usuarios', uid, subcolName);
    const docRef = await addDoc(colRef, {
      ...data,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (err) {
    console.warn(`Firestore addDoc for ${subcolName} skipped (using local ID):`, err);
    return newId;
  }
}

/**
 * Set or Update document in user subcollection by ID
 */
export async function updateUserSubcolDoc(uid: string, subcolName: string, docId: string, data: any) {
  const localKey = `zerum_subcol_${uid}_${subcolName}`;
  try {
    const existing = localStorage.getItem(localKey);
    const list = existing ? JSON.parse(existing) : [];
    const idx = list.findIndex((item: any) => item.id === docId);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...data, updatedAt: new Date().toISOString() };
    } else {
      list.push({ id: docId, ...data, updatedAt: new Date().toISOString() });
    }
    localStorage.setItem(localKey, JSON.stringify(list));
  } catch (e) {}

  try {
    const docRef = doc(db, 'usuarios', uid, subcolName, docId);
    await setDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn(`Firestore updateUserSubcolDoc for ${subcolName} skipped:`, err);
  }
}

/**
 * Delete document from user subcollection
 */
export async function deleteUserSubcolDoc(uid: string, subcolName: string, docId: string) {
  const localKey = `zerum_subcol_${uid}_${subcolName}`;
  try {
    const existing = localStorage.getItem(localKey);
    if (existing) {
      const list = JSON.parse(existing);
      const filtered = list.filter((item: any) => item.id !== docId);
      localStorage.setItem(localKey, JSON.stringify(filtered));
    }
  } catch (e) {}

  try {
    const docRef = doc(db, 'usuarios', uid, subcolName, docId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn(`Firestore deleteUserSubcolDoc for ${subcolName} skipped:`, err);
  }
}

// ----------------------------------------------------
// ADMIN ANONYMOUS METRICS & FEEDBACK
// ----------------------------------------------------

/**
 * Save user feedback anonymously
 */
export async function submitUserFeedback(uid: string, mensaje: string, rating: number) {
  const feedbackRef = collection(db, 'feedback');
  await addDoc(feedbackRef, {
    uidAnon: uid.substring(0, 8) + '...',
    mensaje,
    rating,
    fecha: new Date().toISOString()
  });
}

/**
 * Get anonymous general stats for admin
 */
export async function getAdminAnonymousStats() {
  try {
    const usersSnap = await getDocs(collection(db, 'usuarios'));
    const totalUsers = usersSnap.size;

    const feedbackSnap = await getDocs(collection(db, 'feedback'));
    const totalFeedback = feedbackSnap.size;

    return {
      totalUsuarios: totalUsers,
      usuariosActivosMes: totalUsers, // En entorno real se filtra por ultimaConexion
      versionInstalada: '3.0.0 (Firestore Multi-Tenant)',
      fechaActualizacion: new Date().toISOString(),
      retroalimentacionesContador: totalFeedback
    };
  } catch (e) {
    console.error('Error fetching admin anonymous stats:', e);
    return null;
  }
}
