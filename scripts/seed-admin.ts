import { config } from "dotenv";
import { resolve } from "path";
import { existsSync } from "fs";

// Load environment variables from .env.local
const envPath = resolve(process.cwd(), ".env.local");
if (!existsSync(envPath)) {
  console.error("❌ Error: .env.local file not found!");
  console.error("Please create .env.local file with your Firebase configuration.");
  console.error("See README-FIREBASE.md for instructions.");
  process.exit(1);
}

const result = config({ path: envPath });
if (result.error) {
  console.error("❌ Error loading .env.local:", result.error);
  process.exit(1);
}

// Check required environment variables
const requiredVars = [
  "NEXT_PUBLIC_FIREBASE_DATABASE_URL",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
];

const missingVars = requiredVars.filter(
  (varName) => !process.env[varName]
);

if (missingVars.length > 0) {
  console.error("❌ Error: Missing required environment variables:");
  missingVars.forEach((varName) => console.error(`  - ${varName}`));
  console.error("\nPlease check your .env.local file.");
  process.exit(1);
}

import { UserService } from "../lib/services/user.service";
import { User } from "../lib/types";

async function seedAdmin() {
  try {
    console.log("🚀 Starting admin user seed...");
    
    const userService = new UserService();
    
    // Check if admin user already exists
    const existingAdmin = await userService.getUserByUsername("admin");
    
    if (existingAdmin) {
      console.log("ℹ️  Admin user already exists. Skipping seed.");
      return;
    }
    
    // Create admin user
    await userService.createUser({
      username: "admin",
      password: "123456",
      fullname: "Administrator",
      role: "admin",
      position: "System Administrator",
      telegram: "",
      active: true,
      team: "",
    });
    
    console.log("✅ Admin user created successfully!");
    console.log("📝 Credentials:");
    console.log("   Username: admin");
    console.log("   Password: 123456");
  } catch (error: any) {
    console.error("❌ Error seeding admin user:", error.message || error);
    if (error.message?.includes("FIREBASE")) {
      console.error("\n💡 Tip: Make sure your Firebase configuration is correct in .env.local");
      console.error("   Check README-FIREBASE.md for setup instructions.");
    }
    process.exit(1);
  }
}

// Run the seed function
seedAdmin()
  .then(() => {
    console.log("✨ Seed completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seed failed:", error.message || error);
    process.exit(1);
  });

