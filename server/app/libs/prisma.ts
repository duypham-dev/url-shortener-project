import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = `${process.env.DATABASE_URL}`;

const schema = new URL(connectionString).searchParams.get("schema") || "public";
console.log("Using database schema:", schema);
const adapter = new PrismaPg(
  {
    connectionString: process.env.DATABASE_URL,
  },
  {
    schema,
  },
);

export const prisma = new PrismaClient({ adapter });