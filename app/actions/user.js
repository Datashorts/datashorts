import { db } from "@/configs/db";
import { eq } from "drizzle-orm";
import { users } from "@/configs/schema";

export async function StoreUser(userData) {
  try {
    const { id, email, name } = userData;
    
    if (!id) {
      console.error("User ID is required");
      return null;
    }
    

    const existingUsers = await db.select().from(users).where(eq(users.clerk_id, id));
    
    if (existingUsers.length > 0) {
      console.log("User already exists:", existingUsers[0]);
      return existingUsers[0];
    }
    

    const [newUser] = await db.insert(users).values({
      clerk_id: id,
      name: name || null,
      email: email || null
    }).returning();
    
    console.log("User stored successfully:", newUser);
    return newUser;
  } catch (error) {
    console.error("Error storing user:", error);
    return null;
  }
}