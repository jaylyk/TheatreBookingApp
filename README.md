# CN6035 — Theatre Booking System

Mobile εφαρμογή κράτησης θέσεων σε θεατρικές παραστάσεις.

**Stack:** React Native (Expo) · Node.js 24 + Express · MariaDB 11.4 · Keycloak 26 (OIDC + PKCE)

---

## Αρχιτεκτονική

```
[React Native App]  ──JWT──►  [Node.js REST API :3000]  ──SQL──►  [MariaDB :3306]
                                        │
                               JWKS verify
                                        │
                              [Keycloak :8080]
```

- **Docker Compose** τρέχει MariaDB + Keycloak
- **Backend** τρέχει native (`node`)
- **Mobile** τρέχει μέσω Expo (`npx expo start`)

---

## Προαπαιτούμενα

| Εργαλείο | Έκδοση |
|----------|--------|
| Node.js  | v20+   |
| Docker Desktop | τελευταία |
| Expo CLI | `npm install -g expo-cli` |
| Android Emulator | API 33+ (μέσω Android Studio) |

---

## Εγκατάσταση & Εκκίνηση

### 1. Κλωνοποίηση

```bash
git clone <repo-url>
cd CN6035
```

### 2. Docker Compose (MariaDB + Keycloak)

```bash
docker compose up -d
```

Περιμένει να γίνουν healthy και τα δύο containers (~30 δευτερόλεπτα). Το MariaDB εκτελεί αυτόματα:
- `db/init.sql` — δημιουργία schema (πίνακες, FKs, ENUMs)
- `db/seed.sql` — demo data (3 θέατρα, 4 παραστάσεις, 5 showtimes, 250 θέσεις)

### 3. Keycloak — Realm (auto-import)

Το realm `theatre-booking` εισάγεται **αυτόματα** κατά την εκκίνηση του Keycloak container από το αρχείο `keycloak/realm-export.json`. Περιλαμβάνει:

- Client `mobile-app` (public, PKCE S256) με όλα τα valid redirect URIs (`mobile://*`, `exp://*`, `myapp://auth/callback`)
- Token lifespans: Access 30min, SSO Idle 8h, SSO Max 24h
- Test user: **`testuser` / `12345`**

Admin console: `http://localhost:8080` (admin/admin).

> **Σημείωση:** Αν το realm υπάρχει ήδη (π.χ. από προηγούμενο run), το import παρακάμπτεται. Για clean re-import: `docker compose down -v` (διαγράφει volumes) και ξανά `docker compose up -d`.

### 4. Backend

```bash
cd backend
npm install
node src/server.js
```

Το backend ξεκινά στο `http://localhost:3000`. Επαλήθευση:

```bash
curl http://localhost:3000/health
# {"status":"ok"}
```

### 5. Mobile App (Android Emulator)

```bash
cd mobile
npm install
npx expo start --android
```

> Ο Android emulator επικοινωνεί με τον host μέσω `10.0.2.2` (αντί `localhost`). Αυτό χειρίζεται αυτόματα στο `mobile/src/config.js`.

---

## Δομή Αποθετηρίου

```
CN6035/
├── docker-compose.yml
├── keycloak/
│   └── realm-export.json         ← realm config + test user (auto-imported)
├── db/
│   ├── init.sql                  ← schema (πίνακες, FKs, ENUMs, CHECKs)
│   └── seed.sql                  ← demo data
├── backend/
│   ├── .env                      ← DB + Keycloak config
│   ├── src/
│   │   ├── server.js
│   │   ├── config/               ← env.js, db.js (connection pool)
│   │   ├── middleware/           ← auth.js (JWT/JWKS), currentUser.js, errorHandler.js
│   │   ├── routes/               ← theatres, shows, showtimes, reservations, user
│   │   ├── controllers/          ← λογική HTTP layer
│   │   └── repositories/         ← SQL queries + transactional logic
│   └── package.json
└── mobile/
    ├── App.js                    ← NavigationContainer + AuthProvider
    ├── app.json                  ← scheme: "mobile"
    └── src/
        ├── config.js             ← host detection (10.0.2.2 για Android)
        ├── auth/                 ← PKCE flow, AuthContext, SecureStore
        ├── api/client.js         ← fetch wrapper με auto-refresh on 401
        └── screens/
            ├── LoginScreen.js
            ├── HomeScreen.js       ← λίστα θεάτρων + search
            ├── ShowsScreen.js      ← παραστάσεις ανά θέατρο + search
            ├── ShowtimesScreen.js  ← διαθέσιμες ημερομηνίες
            ├── SeatSelectionScreen.js    ← grid 5×10, χρωματικός κώδικας
            ├── ConfirmReservationScreen.js
            └── MyReservationsScreen.js   ← ιστορικό + ακύρωση
```

---

## Λειτουργικότητα

### Authentication
- **OAuth 2.0 Authorization Code + PKCE** μέσω Keycloak 26
- Tokens αποθηκεύονται στο `expo-secure-store` (encrypted)
- Αυτόματο refresh on HTTP 401 (single retry)
- Ο backend επαληθεύει JWT μέσω JWKS endpoint του Keycloak

### Booking Flow
```
Home (Θέατρα) → Shows (Παραστάσεις) → Showtimes → Seat Selection → Confirm → My Reservations
```

1. **Home** — Λίστα θεάτρων με search (όνομα / τοποθεσία)
2. **Shows** — Παραστάσεις ανά θέατρο με search (τίτλος), διάρκεια, age rating
3. **Showtimes** — Διαθέσιμες ημερομηνίες/ώρες, αίθουσα, τιμή εισιτηρίου
4. **Seat Selection** — Grid 5×10 (50 θέσεις/showtime):
   - 🟡 Premium (σειρές A-B): `base_price × 1.5`
   - 🟢 Standard (σειρές C-E): `base_price`
   - 🟣 Επιλεγμένο | ⬜ Κρατημένο
5. **Confirm** — Σύνοψη θέσεων + σύνολο τιμής + POST `/reservations`
6. **My Reservations** — Ιστορικό, pull-to-refresh, ακύρωση μελλοντικών κρατήσεων

### Concurrency Protection
Η κράτηση χρησιμοποιεί `SELECT ... FOR UPDATE` + `START TRANSACTION` στη MariaDB:
- Αν δύο χρήστες επιλέξουν την ίδια θέση ταυτόχρονα, **μόνο ο πρώτος επιτυγχάνει** (HTTP 201)
- Ο δεύτερος λαμβάνει **HTTP 409 Conflict**
- Δοκιμή: `backend/test-concurrency.ps1` (10 ταυτόχρονες αιτήσεις → 1 SUCCESS, 9 × 409)

---

## REST API Endpoints

Όλα τα endpoints απαιτούν `Authorization: Bearer <access_token>` (εκτός `/health`).

| Method | Path | Περιγραφή |
|--------|------|-----------|
| `GET` | `/health` | Health check (public) |
| `GET` | `/theatres` | Λίστα θεάτρων |
| `GET` | `/shows?theatreId=&title=` | Λίστα παραστάσεων (φίλτρα) |
| `GET` | `/shows/:id` | Λεπτομέρειες παράστασης |
| `GET` | `/shows/:id/showtimes` | Showtimes παράστασης |
| `GET` | `/showtimes/:id` | Λεπτομέρειες showtime |
| `GET` | `/showtimes/:id/seats` | Θέσεις showtime (με status) |
| `POST` | `/reservations` | Δημιουργία κράτησης `{showtime_id, seat_ids[]}` |
| `PATCH` | `/reservations/:id` | Αλλαγή θέσεων `{seat_ids[]}` |
| `DELETE` | `/reservations/:id` | Ακύρωση κράτησης |
| `GET` | `/user/reservations` | Κρατήσεις συνδεδεμένου χρήστη |

---

## Σχήμα Βάσης Δεδομένων

```
users              theatres           shows
─────────────      ────────────       ──────────────────
user_id PK         theatre_id PK      show_id PK
external_id UNIQUE name               theatre_id FK
name               location           title
email              description        description
                                      duration_min
                                      age_rating

showtimes          seats              reservations        reservation_seats
─────────────      ─────────────      ────────────────    ─────────────────
showtime_id PK     seat_id PK         reservation_id PK   reservation_id FK
show_id FK         showtime_id FK     user_id FK          seat_id FK
start_datetime     row_label          showtime_id FK
hall               seat_number        total_price
base_price         category ENUM      status ENUM
                   status ENUM        created_at
```

---

## Demo Data

| | |
|--|--|
| Θέατρα | Εθνικό Θέατρο (Αθήνα), Θέατρο Παλλάς (Αθήνα), Θέατρο Βασιλικόν (Θεσσαλονίκη) |
| Παραστάσεις | Αντιγόνη, Οιδίπους Τύραννος, Όνειρο Καλοκαιρινής Νύχτας, Ο Βυσσινόκηπος |
| Showtimes | 5 (Ιούνιος 2026), τιμές 18–25€ |
| Θέσεις | 50 ανά showtime (A-B premium, C-E standard) |
| Test user | `testuser` / `12345` (Keycloak) |

---

## Γνωστά Θέματα / Σημειώσεις

- **Issuer harmonization:** Το Keycloak εκδίδει tokens με issuer `localhost`, αλλά ο Android emulator επικοινωνεί μέσω `10.0.2.2`. Το backend δέχεται και τους δύο issuers μέσω της `OIDC_ISSUER` env variable (comma-separated).
- **Node.js 24 + mariadb:** Η βιβλιοθήκη χρησιμοποιείται ως `import * as mariadb from 'mariadb'` (named import) λόγω ESM συμβατότητας.
