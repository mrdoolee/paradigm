// Synthesises the three sound effects as tiny 8-bit square-wave WAV files (no outside sound files).
// Usage: npm run build:sfx
import { mkdirSync, writeFileSync } from 'node:fs';

const RATE = 22050;

function wav(samples: Uint8Array): Buffer {
  const b = Buffer.alloc(44 + samples.length);
  b.write('RIFF', 0);
  b.writeUInt32LE(36 + samples.length, 4);
  b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); // PCM
  b.writeUInt16LE(1, 22); // mono
  b.writeUInt32LE(RATE, 24);
  b.writeUInt32LE(RATE, 28);
  b.writeUInt16LE(1, 32);
  b.writeUInt16LE(8, 34);
  b.write('data', 36);
  b.writeUInt32LE(samples.length, 40);
  Buffer.from(samples).copy(b, 44);
  return b;
}

/** notes: [frequency Hz, duration ms]; volume 0..1 with a short linear fade-out per note. */
function tones(notes: [number, number][], volume = 0.35): Uint8Array {
  const parts: number[] = [];
  for (const [f, ms] of notes) {
    const n = Math.round((RATE * ms) / 1000);
    for (let i = 0; i < n; i++) {
      const env = Math.min(1, (n - i) / (n * 0.3));
      const sq = Math.floor((i * f * 2) / RATE) % 2 === 0 ? 1 : -1;
      parts.push(Math.round(128 + 127 * volume * env * sq));
    }
  }
  return Uint8Array.from(parts);
}

mkdirSync('public/sfx', { recursive: true });
writeFileSync('public/sfx/page.wav', wav(tones([[1320, 40]], 0.2)));
writeFileSync('public/sfx/snap.wav', wav(tones([[660, 50], [990, 70]])));
writeFileSync('public/sfx/done.wav', wav(tones([[523, 90], [659, 90], [784, 140]])));
console.log('public/sfx: page.wav snap.wav done.wav');
