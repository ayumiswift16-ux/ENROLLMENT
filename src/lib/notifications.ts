import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

export async function sendNotification(userId: string, title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
  try {
    await addDoc(collection(db, 'notifications'), {
      userId,
      title,
      message,
      type,
      read: false,
      createdAt: new Date().toISOString() // Using string date for simplicity in types, but could use serverTimestamp()
    });
  } catch (error) {
    console.error("Error sending notification:", error);
    // Don't throw here to avoid breaking the main operation
  }
}
