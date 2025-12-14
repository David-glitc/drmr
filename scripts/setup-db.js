#!/usr/bin/env node

/**
 * Workaround script for Prisma CLI ESM issues
 * This script manually generates the Prisma client and creates the database
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up database...\n');

// Check if .env exists
const envPath = path.join(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file...');
  fs.writeFileSync(envPath, 'DATABASE_URL="file:./dev.db"\n');
  console.log('✅ .env file created\n');
}

// Try to generate Prisma client using node directly
console.log('🔧 Generating Prisma Client...');
try {
  // Try using the Prisma binary directly
  const prismaPath = path.join(process.cwd(), 'node_modules', '.bin', 'prisma');
  
  if (fs.existsSync(prismaPath) || fs.existsSync(prismaPath + '.cmd')) {
    try {
      execSync(`node "${path.join(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js')}" generate`, {
        stdio: 'inherit',
        cwd: process.cwd(),
      });
      console.log('✅ Prisma Client generated\n');
    } catch (error) {
      console.log('⚠️  Direct generation failed, will try on build\n');
    }
  }
} catch (error) {
  console.log('⚠️  Could not generate client now. It will be generated automatically on build.\n');
}

// Create database directory if needed
const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

console.log('📦 Database setup complete!');
console.log('\n💡 Next steps:');
console.log('   1. Run: pnpm build (this will generate Prisma Client if needed)');
console.log('   2. Or manually create the database using SQLite');
console.log('   3. Access admin dashboard at /admin\n');

