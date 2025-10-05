import os
import json
import firebase_admin
from firebase_admin import credentials, firestore, auth

# Initialize Firebase Admin SDK using environment variables
# This is more secure than hardcoding credentials
def initialize_firebase():
    if not firebase_admin._apps:
        # Check if running in production (using environment variables)
        firebase_creds = os.environ.get('FIREBASE_CREDENTIALS')
        
        if firebase_creds:
            # Production: Use environment variable (JSON string)
            cred_dict = json.loads(firebase_creds)
            cred = credentials.Certificate(cred_dict)
        else:
            # Development: Use service account key file
            # Make sure serviceAccountKey.json is in .gitignore!
            cred = credentials.Certificate('api/serviceAccountKey.json')
        
        firebase_admin.initialize_app(cred)
    
    return firestore.client()

# Initialize and export the Firestore client
db = initialize_firebase()