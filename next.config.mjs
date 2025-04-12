/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: 'AIzaSyAvnMk4sKg3litMf82RKARDr7wdSez5gLA',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'fshop-5177e.firebaseapp.com',
    NEXT_PUBLIC_FIREBASE_DATABASE_URL: 'https://fshop-5177e-default-rtdb.firebaseio.com',
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'fshop-5177e',
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'fshop-5177e.appspot.com',
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '550095738800',
    NEXT_PUBLIC_FIREBASE_APP_ID: '550095738800:web:24966b9c9a26a124a3e875',
    GOOGLE_SERVICE_ACCOUNT_EMAIL: "your_service_account_email",
    GOOGLE_PRIVATE_KEY: "your_private_key",
    SPREADSHEET_ID: process.env.SPREADSHEET_ID,
  },
  experimental: {
    serverActions: true,
  },
  typescript: {
    ignoreBuildErrors: true
  }
};

export default nextConfig;
