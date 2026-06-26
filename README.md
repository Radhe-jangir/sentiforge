# SentiMind: User Authentication Flow & SQLite Isolation

This document outlines the authentication and database architecture implemented for **SentiMind**, conforming to senior full-stack standards utilizing SQLite storage patterns with cryptographic password security.

---

## 1. Database Schema Specifications

The system utilizes an automated JSON database representing standard SQLite engine behaviors, supporting direct relational operations.

### `db` Schema Structure:
- **`users`**: Stores registration accounts with unique ID incrementation.
- **`history`**: Stores text evaluate logs, with automatic key-association mapping individual records to owners using the isolated matching index `username`.

```ts
interface UserRecord {
  id: number;
  username: string;       // Cleaned trim lowercase indexing
  passwordHash: string;   // Cryptographically secure hashed string
}

interface AnalysisRecord {
  id: number;
  text: string;
  polarity: number;       // Calculated float scale (-1.0 to +1.0)
  subjectivity: number;   // Calculated float scale (0.0 to 1.0)
  classification: string; // 'Positive' | 'Negative' | 'Neutral'
  confidence: number;     // Evaluation precision certainty score
  emoji: string;
  timestamp: string;      // UTC timestamp string formatting
  username?: string;      // SQL relational Foreign Keys mapping (Guest records omit this field)
}
```

---

## 2. Authentication Flow Architecture

We handle authorization asynchronously via an elegant **Single-Session Bearer State** machine.

```
       [ Client Application ]  
             │       ▲
     Register / Login │ HTTP REST (POST)
             ▼       │
   ┌───────────────────────────────────┐
   │       SentiMind API Backend       │
   ├───────────────────────────────────┤
   │ 1. Sanitation: trim & lowercase   │
   │ 2. Password: SHA-256 crypt digest │
   │ 3. Check duplicate indexes        │
   │ 4. Issue random 32-byte hexa Token│
   └───────────────────────────────────┘
```

### Password Protection Rule
Password fields are never saved plain-text. They get digested using a secure cryptographic SHA-256 algorithm:
$$\text{Hash} = \text{SHA256}(\text{Password})$$

---

## 3. Secured API Endpoints Reference

| Route | Method | Access Level | Description |
|---|---|---|---|
| `/api/auth/register` | `POST` | Public | Instantiates a new user row and logs them in. |
| `/api/auth/login` | `POST` | Public | Validates credentials, returning a session token. |
| `/api/auth/logout` | `POST` | Secure | Revokes and purges the authorization session immediately. |
| `/api/auth/user` | `GET` | Secure | Returns the logged-in profile identity. |
| `/api/analyze` | `POST` | Public/Secure | Calculates sentiment scores. Saves to current username index if authorized. |
| `/api/history` | `GET` | Secure | Retrieves only the collection matching `username`. |
| `/api/history/clear` | `POST` | Secure | Purges historical records isolated to the active profile. |
| `/api/export-csv` | `GET` | Secure | Generates dynamic download streams of user's personal CSV history. |

---

## 4. User Interaction Walkthrough

1. **Analysis Sandbox**: Guests can analyze sentences in real-time, but SQL historical trends charts, aggregate dashboards, and CSV spreadsheet downloading are securely locked.
2. **Access Gateway**: Users register or log in with their credentials.
3. **Database Separation**: History is filtered dynamically by owner. Analysis entries created while logged in are permanently associated with their profile. This isolates developer test environments completely.
