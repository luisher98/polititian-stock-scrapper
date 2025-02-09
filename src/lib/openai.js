import fs from "fs";
import dotenv from "dotenv";
import OpenAI from "openai";

import { assistantInstructions } from "../utils/config.js";
import { extractStringBetweenBackticks, isJSON } from "../components/dataValidation.js";

dotenv.config();

const configuration = {
  apiKey: process.env.OPENAI_API_KEY,
};

const openai = new OpenAI(configuration);

export default async function convertPDFToJSON(filePath) {
  try {
    if (!configuration.apiKey) {
      throw new Error(
        "OpenAI API Key not found. Please add it to the .env file."
      );
    }

    const instructions = `${assistantInstructions}`;
    const assistantId = process.env.OPENAI_ASSISTANT_ID;

    
    // Upload the PDF file to OpenAI
    const file = await openai.files.create({
      file: fs.createReadStream(filePath),
      purpose: "assistants",
    });

    // Create a thread with the PDF file
    const thread = await openai.beta.threads.create({
      messages: [
        {
          role: "user",
          content: instructions,
          attachments: [
            {
              file_id: file.id,
              tools: [{ type: "code_interpreter" }],
            },
          ],
        },
      ],
    });

    // Request the information from the assistant
    await openai.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistantId,
    });

    // Get the messages from the thread
    let messages = await openai.beta.threads.messages.list(thread.id);

    // Get the JSON data from the messages
    let data = await messages.data[0].content[0].text.value;

    // Delete the file from OpenAI asynchronously without blocking
    (async () => {
      try {
        await openai.files.del(file.id);
      } catch (error) {
        console.error("Error deleting file:", error);
      }
    })().catch(console.error);

    // Check if the data prompted by openai is in a JSON format

    if (!isJSON(data)) {
      try {
        // sometimes the data is wrapped in tripple backticks
        data = extractStringBetweenBackticks(data);
        data = JSON.parse(data);
      } catch (error) {
        throw new Error("OpenAI did not return a JSON object.");
      }
    }

    // Return the JSON data
    return data;
  } catch (error) {
    throw new Error(`Error with openAI conversion: ${error}`);
  }
}
