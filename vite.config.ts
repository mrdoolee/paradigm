import { defineConfig, type Plugin } from 'vitest/config';
import { existsSync, mkdirSync, readdirSync, renameSync, rmdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const ROOT = import.meta.dirname;
const ACTIVITIES = resolve(ROOT, 'activities');

/** Every activity that has a game page: activities/<id>/index.html. */
const activityIds = () =>
  readdirSync(ACTIVITIES, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(resolve(ACTIVITIES, d.name, 'index.html')))
    .map((d) => d.name);

const removeIfEmpty = (dir: string) => {
  if (existsSync(dir) && readdirSync(dir).length === 0) rmdirSync(dir);
};

/**
 * Serves each activity page at /<id>/ while the file lives in activities/<id>/index.html.
 * Dev: rewrites /<id>/ to the page. Build: one entry per page, then moves
 * dist/activities/<id>/index.html to dist/<id>/index.html.
 */
function activityPages(): Plugin {
  let outDir = resolve(ROOT, 'dist');
  return {
    name: 'nos-activity-pages',
    config: () => ({
      build: {
        rollupOptions: {
          input: Object.fromEntries([
            ['home', resolve(ROOT, 'index.html')],
            ...activityIds().map((id) => [id, resolve(ACTIVITIES, id, 'index.html')]),
          ]),
        },
      },
    }),
    configResolved(c) {
      outDir = resolve(c.root, c.build.outDir);
    },
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const m = req.url?.match(/^\/([\w-]+)(?:\/(?:index\.html)?)?(\?.*)?$/);
        if (m && activityIds().includes(m[1])) req.url = `/activities/${m[1]}/index.html${m[2] ?? ''}`;
        next();
      });
    },
    closeBundle() {
      for (const id of activityIds()) {
        const from = resolve(outDir, 'activities', id, 'index.html');
        if (!existsSync(from)) continue;
        const to = resolve(outDir, id, 'index.html');
        mkdirSync(dirname(to), { recursive: true });
        renameSync(from, to);
        removeIfEmpty(dirname(from));
      }
      removeIfEmpty(resolve(outDir, 'activities'));
    },
  };
}

export default defineConfig({
  plugins: [activityPages()],
  resolve: {
    alias: {
      '@engine': resolve(ROOT, 'src/engine'),
      '@rpg': resolve(ROOT, 'src/rpg'),
    },
  },
  build: {
    target: 'es2022',
  },
  test: {
    globals: true,
    include: ['tests/unit/**/*.test.ts', 'activities/*/tests/unit/**/*.test.ts'],
  },
});
