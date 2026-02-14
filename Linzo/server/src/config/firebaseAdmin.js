import dotenv from 'dotenv';
dotenv.config({ silent: true });
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../'); // Go up to server root

// Attempt to load from firebase-admin.json in the root directory
const serviceAccountPath = path.join(rootDir, 'firebase-admin.json');

let serviceAccount;

// 1. Try loading from file
if (fs.existsSync(serviceAccountPath)) {
    try {
        const rawData = fs.readFileSync(serviceAccountPath, 'utf8');
        serviceAccount = JSON.parse(rawData);
        console.log('✅ Loaded Firebase credentials from firebase-admin.json');
    } catch (error) {
        console.error('❌ Error reading/parsing firebase-admin.json:', error);
    }
}

// 2. Fallback to Environment Variables
if (!serviceAccount) {
    try {
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            // Check if it's a file path
            if (process.env.FIREBASE_SERVICE_ACCOUNT.endsWith('.json') && fs.existsSync(process.env.FIREBASE_SERVICE_ACCOUNT)) {
                serviceAccount = JSON.parse(fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT, 'utf8'));
            } else {
                serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            }
        } else if (process.env.FIREBASE_ADMIN) {
            serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN);
        }
    } catch (error) {
        console.error('Error parsing FIREBASE env var:', error.message);
    }
}

// 3. Fallback to individual fields
if (!serviceAccount && process.env.FIREBASE_PROJECT_ID) {
    serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
    }
}

// 4. Initialize App
if (!admin.apps.length) {
    // Validate that we have a project ID (check both camelCase and snake_case)
    const hasProjectId = serviceAccount && (serviceAccount.projectId || serviceAccount.project_id);

    if (hasProjectId) {
        try {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            console.log('🔥 Firebase Admin initialized successfully');
        } catch (error) {
            console.error('❌ Firebase Admin initialization failed:', error);
        }
    } else {
        console.warn('⚠️ Firebase Admin not initialized: Missing credentials. Please check your .env or firebase-admin.json');
    }
}

export default admin;
