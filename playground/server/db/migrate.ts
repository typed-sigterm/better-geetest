/* eslint-disable no-console */
/* eslint-disable antfu/no-top-level-await */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Database } from 'bun:sqlite';

const database = new Database('./.data/db.sqlite');
database.run(`
  create table if not exists "_migrations" (
    "name" text not null primary key,
    "appliedAt" text not null
  )
`);

const migrationsDirectory = join(import.meta.dir, 'migrations');
const migrations = (await readdir(migrationsDirectory))
  .filter(file => file.endsWith('.sql'))
  .sort();

for (const name of migrations) {
  const applied = database
    .query('select 1 from "_migrations" where "name" = ?')
    .get(name);

  if (applied)
    continue;

  const sql = await readFile(join(migrationsDirectory, name), 'utf8');
  database.transaction(() => {
    database.run(sql);
    database.query('insert into "_migrations" ("name", "appliedAt") values (?, ?)').run(name, new Date().toISOString());
  })();
  console.log(`Applied ${name}`);
}

database.close();
