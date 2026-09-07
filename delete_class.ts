import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, writeBatch, query, where } from 'firebase/firestore';
import * as fs from 'fs';

const configStr = fs.readFileSync('firebase-applet-config.json', 'utf8');
const config = JSON.parse(configStr);

const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const batch = writeBatch(db);
  const className = 'Yêu thương';

  // Find assignments
  const q1 = query(collection(db, 'assignments'), where('className', '==', className));
  const snap1 = await getDocs(q1);
  console.log('Assignments found:', snap1.size);
  snap1.forEach(docSnap => {
    batch.update(docSnap.ref, { className: '' });
  });

  // Find class sessions
  const q2 = query(collection(db, 'class_sessions'), where('className', '==', className));
  const snap2 = await getDocs(q2);
  console.log('Class Sessions found:', snap2.size);
  snap2.forEach(docSnap => {
    batch.update(docSnap.ref, { className: '' });
  });
  
  // Find users just in case
  const q3 = query(collection(db, 'users'), where('className', '==', className));
  const snap3 = await getDocs(q3);
  console.log('Users found:', snap3.size);
  snap3.forEach(docSnap => {
    batch.update(docSnap.ref, { className: '' });
  });

  await batch.commit();
  console.log('Done clearing class', className);
}

run().catch(console.error);
