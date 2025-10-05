import firebase_admin
from firebase_admin import credentials, firestore, auth

# Initialize Firebase Admin SDK
# Download service account key from Firebase Console > Project Settings > Service Accounts > Generate Private Key
# Place the JSON file in this directory and update the path below
cred = credentials.Certificate('api/serviceAccountKey.json')
firebase_admin.initialize_app(cred)

# Firestore client
db = firestore.client()