# Reckoning

Reckoning — Sunday check-in. Private. You vs you.

Reckoning is a phone-first PWA for weekly Sunday body-progress check-ins: a required front photo, optional side photo, weight in kg, and a short note. Photos stay on this device in IndexedDB (entry metadata in localStorage). There is no login, cloud sync, or AI in v1.

Run locally with `npm install` then `npm run dev`, and open [http://localhost:3000](http://localhost:3000) (use `npx next dev -p 3001` if 3000 is taken). Add two check-ins via Capture to exercise Timeline and Compare. Offline viewing of saved pages works after a production build (`npm run build && npm start`) once the service worker has cached the app; photos still load from IndexedDB on this phone.
