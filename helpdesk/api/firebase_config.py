import os
import json
import datetime
import urllib.request
import email.utils
import google.auth._helpers as helpers

# Fix local development clock skew / NTP synchronization issues dynamically
def apply_clock_skew_patch():
    try:
        req = urllib.request.Request("https://www.google.com", method="HEAD")
        with urllib.request.urlopen(req, timeout=3) as resp:
            date_str = resp.headers.get("Date")
            if date_str:
                remote_time = datetime.datetime(*email.utils.parsedate(date_str)[:6])
                local_time = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
                offset = int((local_time - remote_time).total_seconds())
                
                # Only apply if the skew is significant (more than 10 seconds)
                if abs(offset) > 10:
                    original_utcnow = helpers.utcnow
                    helpers.utcnow = lambda: original_utcnow() - datetime.timedelta(seconds=offset)
                    print(f"[Firebase Config] Applied clock skew patch (Offset: {offset}s)")
    except Exception as e:
        # Fallback to standard time if offline or error
        pass

apply_clock_skew_patch()

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