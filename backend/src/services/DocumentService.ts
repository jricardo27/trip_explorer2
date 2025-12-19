import { TripDocument } from "@prisma/client"

import prisma from "../utils/prisma"

export class DocumentService {
  async createDocument(data: {
    tripId: string
    title: string
    url: string
    notes?: string
    category?: string
  }): Promise<TripDocument> {
    return prisma.tripDocument.create({
      data,
    })
  }

  async getDocumentById(id: string): Promise<TripDocument | null> {
    return prisma.tripDocument.findUnique({
      where: { id },
    })
  }

  async listDocumentsByTrip(tripId: string): Promise<TripDocument[]> {
    return prisma.tripDocument.findMany({
      where: { tripId },
      orderBy: { createdAt: "asc" },
    })
  }

  async updateDocument(
    id: string,
    data: Partial<{
      title: string
      url: string
      notes: string
      category: string
    }>,
  ): Promise<TripDocument> {
    return prisma.tripDocument.update({
      where: { id },
      data,
    })
  }

  async deleteDocument(id: string): Promise<void> {
    await prisma.tripDocument.delete({
      where: { id },
    })
  }
}

export default new DocumentService()
