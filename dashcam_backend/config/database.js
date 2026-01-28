import { PrismaClient } from '@prisma/client';

// Configure Prisma with increased connection pool for high-frequency updates
// Increase connection pool size by modifying DATABASE_URL if it contains connection_limit
let databaseUrl = process.env.DATABASE_URL || '';
if (databaseUrl.includes('connection_limit=')) {
  databaseUrl = databaseUrl.replace(/connection_limit=\d+/, 'connection_limit=20');
} else if (databaseUrl && !databaseUrl.includes('connection_limit')) {
  // Add connection_limit if not present
  databaseUrl += (databaseUrl.includes('?') ? '&' : '?') + 'connection_limit=20';
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl || process.env.DATABASE_URL
    }
  },
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

export default prisma;
