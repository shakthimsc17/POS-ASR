import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import prisma from './config/prisma';

const PORT = process.env.PORT || 5000;

// Auto-heal / synchronize database table schema on startup
async function ensureDatabaseSchema() {
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "showMrpOnReceipt" BOOLEAN DEFAULT true;`
    );
    console.log('✓ Database schema verified (StoreSettings columns synchronized)');
  } catch (err: any) {
    // ignore if table doesn't exist yet before initial migration
  }
}

app.listen(PORT, async () => {
  await ensureDatabaseSchema();
  console.log(`===============================================`);
  console.log(`🚀 ASRTEX Textile POS API Server Running`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🕒 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`===============================================`);
});
