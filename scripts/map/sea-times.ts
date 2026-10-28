// Prints sailing time from Hamburg to each port (tuning aid). Usage: npx tsx scripts/map/sea-times.ts
import { sailSeconds } from '../../src/game/continental-drift/sea';
for (const id of ['mumbai', 'sydney', 'capetown', 'newyork'] as const) console.log(id, sailSeconds('hamburg', id).toFixed(1), 's');
