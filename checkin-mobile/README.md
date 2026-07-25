# CheckIn Mobile (Expo)

React Native / Expo port of the Kotlin **CheckIn & Attendance** app with Home, Attendance, and Profile tabs, Appwrite backend, and real GPS geofence verification.

## Features

- Home: live clock, animated clock in/out button, location banner, shift summary
- Attendance: monthly calendar, search, filters, metrics, detail sheet, adjustment dialog
- Profile: editable employee details and live office geofence status
- Appwrite auth + databases for profiles and attendance
- Real GPS distance check with 500m geofence threshold via `expo-location`

## Prerequisites

- Node.js 20+
- Expo Go app or Android/iOS emulator

## Run

```bash
cd checkin-mobile
npm install
npm start
```

Then press `a` for Android or scan the QR code with Expo Go.

Platform shortcuts:

```bash
npm run android
npm run ios
npm run web
```

## Tests

```bash
npm test
```

## Project Structure

- `app/` — Expo Router tabs and root layout
- `src/repositories/` — attendance business logic (in-memory for now)
- `src/services/` — GPS + haversine geofence helpers
- `src/hooks/AttendanceProvider.tsx` — app state (Kotlin `MainViewModel` equivalent)
- `src/screens/` — tab screen UI
- `src/components/` — shared dialogs, tab bar, bottom sheets

## Appwrite

Client is configured for project **Attendance**:

- Endpoint: `https://appwrite.intoship.cloud/v1`
- Project ID: set in `.env` as `EXPO_PUBLIC_APPWRITE_PROJECT_ID`

Files:

- [`src/config/appwrite.ts`](src/config/appwrite.ts) — env-backed config
- [`src/lib/appwrite.ts`](src/lib/appwrite.ts) — `Client`, `Account`, `Databases`

Schema can be created/updated with:

```bash
# APPWRITE_API_KEY must be set in .env (gitignored)
npm run setup:appwrite
```

Current IDs:

- Database: `6a620add0004cdbbbaba`
- Profiles collection: `profiles`
- Attendance collection: `attendance_records`

Auth + Appwrite repository are wired:

1. Register Android platform in Appwrite Console: `com.ayersh009.checkinmobile`
2. Enable **Email/Password** auth in Appwrite Console → Auth → Settings
3. App flow: Login/Register → tabs; clock-in/out + profile sync to Appwrite
4. Sign out is available on the Profile tab

SDK versions are pinned for your self-hosted server **Appwrite 1.7.4**:

- `react-native-appwrite@0.10.0`
- `node-appwrite@17.1.0` (schema script only)

## Notes

- The original Kotlin app in `checkin-&-attendance/` is unchanged.
- Clock-in requires location permission and being within 500m of the assigned office coordinates.
- Data resets on app reload until Appwrite collections + auth are wired.
- Regularization requests are UI-only, matching the Kotlin prototype.
