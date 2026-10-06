# Wake Music Alarm

A simple React + Vite browser alarm for iPad.

## Features

- Set a wake-up time.
- Select a local audio file.
- Music plays for exactly 30 minutes.
- No stop/snooze control is shown while the alarm is playing.
- Music stops automatically after 30 minutes.
- "Test Music Now" lets you verify the audio before sleeping.

## Run

```bash
npm install
npm run dev
```

Open the Vite URL in your browser.

## Production build

```bash
npm run build
```

The generated `dist` folder can be hosted on GitHub Pages, Vercel, Netlify, etc.

## iPad note

A normal browser webpage cannot override iPadOS background/lock behavior. For reliable browser operation, keep the webpage open and keep the iPad awake. Also test the exact iPad/browser setup before relying on it as your only alarm.