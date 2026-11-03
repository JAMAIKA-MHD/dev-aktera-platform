// The music under every template's player screens (src/sounds/), looped for as long as the
// page is open (audio.ts setMusic): bundled with the app, hashed and cached like the themes'
// own files, never fetched from anywhere else. Every template plays the same one.

const MUSIC = import.meta.glob<string>(
  "../../../../sounds/the_mountain-retro-game-593063.mp3",
  { eager: true, query: "?url", import: "default" },
);

export const MUSIC_URL: string | null = Object.values(MUSIC)[0] ?? null;
