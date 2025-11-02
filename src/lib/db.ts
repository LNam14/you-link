import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Initialize Prisma client
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: ['error', 'warn'],
  });
};

// Ensure we only create one instance of PrismaClient
const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Initialize database connection
let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  try {
    await prisma.$connect();
    isConnected = true;
    console.log('Database connection established successfully');
  } catch (err) {
    console.error('Database connection failed:', err);
    throw err;
  }
}

// Export both prisma client and connection function
export { prisma, connectDB, prisma as db }; 