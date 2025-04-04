import { db } from "@/configs/db"
import { folders } from "@/configs/schema"
import { eq } from "drizzle-orm"

export async function createFolder(userId: string, name: string) {
  try {
    const newFolder = await db.insert(folders).values({
      userId,
      name,
    }).returning()
    
    return newFolder[0]
  } catch (error) {
    console.error("Error creating folder:", error)
    throw error
  }
}

export async function getFolders(userId: string) {
  try {
    const userFolders = await db.select().from(folders).where(eq(folders.userId, userId))
    return userFolders
  } catch (error) {
    console.error("Error fetching folders:", error)
    throw error
  }
}

export async function deleteFolder(folderId: number) {
  try {
    await db.delete(folders).where(eq(folders.id, folderId))
  } catch (error) {
    console.error("Error deleting folder:", error)
    throw error
  }
} 