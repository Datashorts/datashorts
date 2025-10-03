"use server";

import { currentUser } from "@clerk/nextjs/server";
import OpenAI from "openai";
import { index } from "@/app/lib/pinecone";
import { db } from "@/configs/db";
import { eq } from "drizzle-orm";
import { chats, dbConnections } from "@/configs/schema";
import { chunkTableData } from "@/lib/utils/tokenManagement";
import { processPipeline2Query } from "./pipeline2Query";
import { deductCredits, hasEnoughCredits } from "@/app/lib/credits";

export async function getChatHistory(connectionId: string | number) {
  try {
    console.log(`Fetching chat history for connection ID: ${connectionId}`);

    const chatHistory = await db
      .select()
      .from(chats)
      .where(eq(chats.connectionId, Number(connectionId)))
      .orderBy(chats.createdAt);

    console.log(
      `Found ${chatHistory.length} chat records for connection ID: ${connectionId}`
    );

    if (!chatHistory.length) {
      console.log("No chat history found, returning empty array");
      return [];
    }

    if (
      !chatHistory[0].conversation ||
      !Array.isArray(chatHistory[0].conversation)
    ) {
      console.log(
        "Conversation is not an array or is missing:",
        chatHistory[0].conversation
      );
      return [];
    }

    console.log(
      `Processing ${chatHistory[0].conversation.length} conversation items`
    );

    // Create a map to track unique messages while preserving indices
    const uniqueMessages = new Map();
    const originalConversation = chatHistory[0].conversation;

    originalConversation.forEach((chat, originalIndex) => {
      if (chat.message) {
        const key = chat.message;
        // Only update if this message doesn't exist or if it has a response
        if (
          !uniqueMessages.has(key) ||
          (chat.response && Object.keys(chat.response).length > 0)
        ) {
          uniqueMessages.set(key, {
            ...chat,
            originalIndex, // Store the original index
          });
        }
      }
    });

    // Convert map to array and sort by original index
    return Array.from(uniqueMessages.values())
      .sort((a, b) => a.originalIndex - b.originalIndex)
      .map((chat, displayIndex) => {
        try {
          const parsedResponse = JSON.parse(chat.response);
          return {
            id: `${connectionId}-${displayIndex}`,
            message: chat.message,
            response: {
              agentType: parsedResponse.agentType,
              agentOutput: parsedResponse.agentOutput,
            },
            timestamp: chat.timestamp,
            connectionId,
            bookmarked: chat.bookmarked || false,
            originalIndex: chat.originalIndex, // Keep the original index
          };
        } catch (error) {
          console.error(
            `Error parsing response for chat item ${displayIndex}:`,
            error
          );
          return {
            id: `${connectionId}-${displayIndex}`,
            message: chat.message || "",
            response: {
              agentType: "unknown",
              agentOutput: "Error parsing response",
            },
            timestamp: chat.timestamp || new Date().toISOString(),
            connectionId,
            bookmarked: chat.bookmarked || false,
            originalIndex: chat.originalIndex, // Keep the original index
          };
        }
      });
  } catch (error) {
    console.error("Error fetching chat history:", error);
    return [];
  }
}

export async function submitChat(userQuery: string, url: string, predictiveMode: boolean = false) {
  console.log("Submitting chat with query:", userQuery);
  console.log("URL:", url);
  console.log("Predictive Mode:", predictiveMode);

  const urlParts = url.split("/");
  const connectionId = urlParts[urlParts.length - 2];
  const connectionName = urlParts[urlParts.length - 1];

  console.log(
    `Extracted connection ID: ${connectionId}, connection name: ${connectionName}`
  );

  try {
    // Get current user first for credit check
    const user = await currentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Check if user has enough credits
    const hasCredits = await hasEnoughCredits(user.id, 1);
    if (!hasCredits) {
      console.log("User has insufficient credits");
      // Return error in the same format as other responses
      return {
        success: false,
        connectionId,
        connectionName,
        agentType: "error",
        agentOutput: {
          message: "Insufficient credits. Please purchase more credits to continue.",
          requiresCredits: true
        }
      };
    }

    const connectionDetails = await db
      .select()
      .from(dbConnections)
      .where(eq(dbConnections.id, parseInt(connectionId)))
      .limit(1);

    if (!connectionDetails || connectionDetails.length === 0) {
      throw new Error("Connection not found");
    }

    const connection = connectionDetails[0];
    console.log("Connection details:", connection);

    // Process the query using pipeline 2 embeddings
    const result = await processPipeline2Query(userQuery, connectionId, predictiveMode);

    // Store the chat in the database
    await storeChatInDatabase(
      userQuery,
      {
        success: true,
        connectionId,
        connectionName,
        agentType: "pipeline2",
        agentOutput: result,
      },
      connectionId
    );

    // Deduct credits after successful processing
    const creditDeducted = await deductCredits(user.id, 1);
    if (!creditDeducted) {
      console.warn("Failed to deduct credits after successful query processing");
    } else {
      console.log("Successfully deducted 1 credit from user:", user.id);
    }

    return {
      success: true,
      connectionId,
      connectionName,
      agentType: "pipeline2",
      agentOutput: result,
    };
  } catch (error) {
    console.error("Error in submitChat:", error);
    // Don't deduct credits if there was an error
    throw error;
  }
}


async function storeChatInDatabase(
  userQuery: string,
  response: {
    success: boolean;
    connectionId: string | number;
    connectionName: string;
    agentType: string;
    agentOutput: any;
    error?: string;
  },
  connectionId: string | number
) {
  try {
    console.log(`Storing chat for connection ID: ${connectionId}`);
    console.log("User query:", userQuery);
    console.log("Response:", JSON.stringify(response, null, 2));

    const user = await currentUser();
    if (!user) {
      console.error("No authenticated user found");
      return;
    }

    const existingChats = await db
      .select()
      .from(chats)
      .where(eq(chats.connectionId, Number(connectionId)));

    console.log(
      `Found ${existingChats.length} existing chat records for connection ID: ${connectionId}`
    );

    const timestamp = new Date().toISOString();

    const chatEntry = {
      message: userQuery,
      response: JSON.stringify(response),
      timestamp,
    };

    console.log("Prepared chat entry:", JSON.stringify(chatEntry, null, 2));

    if (existingChats.length > 0) {
      const existingChat = existingChats[0];
      const conversation =
        (existingChat.conversation as Array<{
          message: string;
          response: string;
          timestamp: string;
        }>) || [];

      console.log(`Existing conversation has ${conversation.length} entries`);

      conversation.push(chatEntry);

      await db
        .update(chats)
        .set({
          conversation,
          updatedAt: new Date(),
        })
        .where(eq(chats.id, existingChat.id));

      console.log(`Updated chat record for connection ID: ${connectionId}`);
    } else {
      await db.insert(chats).values({
        userId: user.id,
        connectionId: parseInt(String(connectionId)),
        conversation: [chatEntry],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(`Created new chat record for connection ID: ${connectionId}`);
    }
  } catch (error) {
    console.error("Error storing chat in database:", error);
  }
}

export async function toggleBookmark(
  connectionId: string | number,
  index: number
) {
  try {
    console.log(
      `Toggling bookmark for connection ID: ${connectionId}, index: ${index}`
    );

    // Get the current chat history
    const chatHistory = await db
      .select()
      .from(chats)
      .where(eq(chats.connectionId, Number(connectionId)))
      .orderBy(chats.createdAt);

    if (!chatHistory.length || !chatHistory[0].conversation) {
      throw new Error("No chat history found");
    }

    const conversation = chatHistory[0].conversation;
    if (index < 0 || index >= conversation.length) {
      throw new Error("Invalid index");
    }

    // Toggle the bookmark status
    const newBookmarkStatus = !conversation[index].bookmarked;
    conversation[index].bookmarked = newBookmarkStatus;

    // Update the database
    await db
      .update(chats)
      .set({
        conversation,
        updatedAt: new Date(),
      })
      .where(eq(chats.id, chatHistory[0].id));

    return newBookmarkStatus;
  } catch (error) {
    console.error("Error toggling bookmark:", error);
    throw error;
  }
}
