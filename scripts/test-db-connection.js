/**
 * Test Database Connection Script
 * 
 * This script tests the connection to your PostgreSQL database
 * and provides helpful diagnostics if it fails.
 */

const { PrismaClient } = require("@prisma/client");

async function testConnection() {
  console.log("🔍 Testing database connection...\n");

  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error("❌ ERROR: DATABASE_URL environment variable is not set!");
    console.log("\n📝 Please add DATABASE_URL to your .env file:");
    console.log('DATABASE_URL="postgres://avnadmin:AVNS_lkyZnpUdhDOJ7E-9lJO@drmr-1-drmr-dashboard.b.aivencloud.com:25898/defaultdb?sslmode=require"');
    process.exit(1);
  }

  // Show connection string (hide password)
  const url = process.env.DATABASE_URL;
  const maskedUrl = url.replace(/:[^:@]+@/, ":****@");
  console.log(`📡 Connection string: ${maskedUrl}\n`);

  const prisma = new PrismaClient({
    log: ["error"],
  });

  try {
    // Test connection
    console.log("⏳ Attempting to connect...");
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ SUCCESS: Database connection successful!\n");

    // Test if tables exist
    console.log("📊 Checking database schema...");
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    
    if (tables.length === 0) {
      console.log("⚠️  WARNING: No tables found in database.");
      console.log("   Run 'pnpm db:push' to create tables.\n");
    } else {
      console.log(`✅ Found ${tables.length} table(s):`);
      tables.forEach((table) => {
        console.log(`   - ${table.table_name}`);
      });
      console.log();
    }

    await prisma.$disconnect();
    console.log("✅ All checks passed!");
  } catch (error) {
    console.error("\n❌ ERROR: Database connection failed!\n");
    console.error("Error details:", error.message);
    console.error("\n");

    // Provide helpful diagnostics
    if (error.message.includes("Can't reach database server")) {
      console.log("🔧 Troubleshooting steps:");
      console.log("   1. Check if your database server is running");
      console.log("   2. Verify the host and port are correct");
      console.log("   3. Check your network/firewall settings");
      console.log("   4. For Aiven: Check if your IP is whitelisted");
      console.log("   5. Verify SSL settings (sslmode=require for Aiven)");
    } else if (error.message.includes("authentication")) {
      console.log("🔧 Troubleshooting steps:");
      console.log("   1. Verify username and password are correct");
      console.log("   2. Check if the user has proper permissions");
    } else if (error.message.includes("does not exist")) {
      console.log("🔧 Troubleshooting steps:");
      console.log("   1. Verify the database name is correct");
      console.log("   2. Create the database if it doesn't exist");
    }

    await prisma.$disconnect();
    process.exit(1);
  }
}

testConnection();

