import { execSync } from "child_process"

async function main() {
  console.log("🌱 Starting database seeding...\n")

  try {
    console.log("1️⃣  Seeding countries...")
    execSync("npx ts-node prisma/seeds/countries.ts", { stdio: "inherit" })

    console.log("\n2️⃣  Seeding cities...")
    execSync("npx ts-node prisma/seeds/cities.ts", { stdio: "inherit" })

    console.log("\n✅ All seeds completed successfully!")
  } catch (error) {
    console.error("\n❌ Seeding failed:", error)
    process.exit(1)
  }
}

main()
