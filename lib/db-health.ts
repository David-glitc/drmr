/**
 * Database Health Check Utility
 * 
 * Checks if database is accessible and provides helpful error messages
 */

import { prisma } from "./prisma";

export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  error?: string;
  message?: string;
}> {
  try {
    // Simple query to test connection
    await prisma.$queryRaw`SELECT 1`;
    
    return {
      healthy: true,
      message: "Database connection successful",
    };
  } catch (error: any) {
    let errorMessage = "Database connection failed";
    let helpfulMessage = "";

    // Check for common error types
    if (error?.code === "P1001") {
      errorMessage = "Cannot reach database server";
      helpfulMessage = "Please check:\n- Database server is running\n- DATABASE_URL is correct\n- Network/firewall allows connection\n- SSL settings are correct";
    } else if (error?.code === "P1000") {
      errorMessage = "Authentication failed";
      helpfulMessage = "Please check:\n- Database username and password\n- User has proper permissions";
    } else if (error?.code === "P1003") {
      errorMessage = "Database does not exist";
      helpfulMessage = "Please create the database or check the database name in DATABASE_URL";
    } else if (error?.message?.includes("Can't reach database server")) {
      errorMessage = "Cannot reach database server";
      helpfulMessage = `Connection string: ${process.env.DATABASE_URL ? "Set" : "NOT SET"}\n\nPlease check:\n- Database server is running\n- Network/firewall allows connection\n- For Aiven: Check if IP whitelist includes your IP\n- SSL settings (sslmode=require for Aiven)`;
    }

    return {
      healthy: false,
      error: errorMessage,
      message: helpfulMessage || error?.message || "Unknown database error",
    };
  }
}

