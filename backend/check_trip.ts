import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const token = "78bdcdc2be55df39bdb387ef865b7f2e"
  console.log(`Checking trip for token: ${token}`)

  const trip = await prisma.trip.findFirst({
    where: { publicToken: token },
  })

  if (trip) {
    console.log("Trip found:", {
      id: trip.id,
      name: trip.name,
      isPublic: trip.isPublic,
      publicToken: trip.publicToken,
    })
  } else {
    console.log("Trip NOT found via findFirst({ where: { publicToken } })")
  }

  // List all public trips
  const publicTrips = await prisma.trip.findMany({
    where: { isPublic: true },
    select: { id: true, name: true, publicToken: true },
  })
  console.log("All Public Trips:", publicTrips)
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
