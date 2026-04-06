import {GoogleSignin} from '@react-native-google-signin/google-signin';

// Web SDK client id from Firebase console (OAuth 2.0 Client IDs)
export const FIREBASE_WEB_CLIENT_ID =
  '750350216214-lqlhhj503l3rambm47536t7ejs508tta.apps.googleusercontent.com';

let configured = false;

export function configureFirebaseAuth() {
  if (configured) {
    return;
  }

  GoogleSignin.configure({
    webClientId: FIREBASE_WEB_CLIENT_ID,
    offlineAccess: false,
  });

  configured = true;
}
