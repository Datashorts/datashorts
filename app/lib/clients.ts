import OpenAI from "openai";

// OpenAI client
export const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}); 