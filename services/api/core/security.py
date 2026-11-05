import base64
import hashlib
import hmac
import json
import os
import time
from typing import Optional, Dict, Any
from services.api.core.config import settings

def hash_password(password: str) -> str:
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt,
        iterations=100000
    )
    return f"{salt.hex()}${key.hex()}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        parts = hashed_password.split('$')
        if len(parts) != 2:
            return False
        salt = bytes.fromhex(parts[0])
        expected_key = bytes.fromhex(parts[1])
        actual_key = hashlib.pbkdf2_hmac(
            'sha256',
            plain_password.encode('utf-8'),
            salt,
            iterations=100000
        )
        return hmac.compare_digest(actual_key, expected_key)
    except Exception:
        return False

def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode('utf-8').rstrip('=')

def _b64url_decode(s: str) -> bytes:
    padding = '=' * (4 - (len(s) % 4)) if len(s) % 4 != 0 else ''
    return base64.urlsafe_b64decode(s + padding)

def create_access_token(data: Dict[str, Any], expires_delta: Optional[int] = None) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    payload = data.copy()
    now = int(time.time())
    exp = now + (expires_delta if expires_delta else settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    payload["iat"] = now
    payload["exp"] = exp

    header_b64 = _b64url_encode(json.dumps(header, separators=(',', ':')).encode('utf-8'))
    payload_b64 = _b64url_encode(json.dumps(payload, separators=(',', ':')).encode('utf-8'))
    
    signing_input = f"{header_b64}.{payload_b64}".encode('utf-8')
    signature = hmac.new(settings.SECRET_KEY.encode('utf-8'), signing_input, hashlib.sha256).digest()
    signature_b64 = _b64url_encode(signature)
    
    return f"{header_b64}.{payload_b64}.{signature_b64}"

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        header_b64, payload_b64, signature_b64 = parts
        signing_input = f"{header_b64}.{payload_b64}".encode('utf-8')
        expected_sig = hmac.new(settings.SECRET_KEY.encode('utf-8'), signing_input, hashlib.sha256).digest()
        actual_sig = _b64url_decode(signature_b64)
        
        if not hmac.compare_digest(expected_sig, actual_sig):
            return None
        
        payload = json.loads(_b64url_decode(payload_b64).decode('utf-8'))
        if payload.get("exp", 0) < int(time.time()):
            return None
        return payload
    except Exception:
        return None
