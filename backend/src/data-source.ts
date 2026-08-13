import 'dotenv/config';
import { DataSource } from 'typeorm';

/**
 * Standalone DataSource for the TypeORM CLI (migration:generate / migration:run).
 * The running Nest app builds its own connection via TypeOrmModule.forRootAsync
 * in app.module.ts — this file only exists so `typeorm-ts-node-commonjs` has
 * something to import; it is never imported by application code.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'osago',
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
});
