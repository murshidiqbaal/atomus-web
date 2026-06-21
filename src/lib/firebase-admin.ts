import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getMessaging, Messaging } from "firebase-admin/messaging";

let messagingInstance: Messaging | null = null;

try {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    // Handle escaped newlines in environment variables
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  const appsList = getApps();

  if (appsList.length === 0) {
    if (projectId && clientEmail && privateKey) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log("Firebase Admin SDK initialized successfully.");
      messagingInstance = getMessaging();
    } else {
      console.warn(
        "Firebase Admin credentials missing. Push notifications will be logged and saved to DB, but not pushed to Google/Apple services."
      );
    }
  } else {
    messagingInstance = getMessaging(appsList[0]);
  }
} catch (error) {
  console.error("Failed to initialize Firebase Admin SDK:", error);
}

export const messaging = messagingInstance;
