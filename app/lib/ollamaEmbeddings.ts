/**
 * Generate embeddings using the Ollama API
 * @param input Text or array of texts to generate embeddings for
 * @param model Name of the model to use (default: all-minilm)
 * @returns Array of embeddings
 */
export async function generateOllamaEmbeddings(
  input: string | string[],
  model: string = 'all-minilm'
): Promise<number[][]> {
  try {
    console.log(`Generating Ollama embeddings for model: ${model}`);
    
    // Convert single string to array for consistent handling
    const inputs = Array.isArray(input) ? input : [input];
    console.log(`Input length: ${inputs.length}, first input length: ${inputs[0].length} characters`);
    
    // Check if the model is available
    let modelAvailable = false;
    try {
      console.log(`Checking if model ${model} is available...`);
      const modelCheck = await fetch(`http://localhost:11434/api/tags`, {
        method: 'GET',
        cache: 'no-store'
      });
      
      if (modelCheck.ok) {
        const modelData = await modelCheck.json();
        const modelExists = modelData.models.some((m: any) => m.name === model);
        
        if (modelExists) {
          console.log(`Model ${model} is available`);
          modelAvailable = true;
        } else {
          console.log(`Model ${model} not found. Available models: ${modelData.models.map((m: any) => m.name).join(', ')}`);
          // Try to pull the model
          console.log(`Attempting to pull model ${model}...`);
          try {
            const pullResponse = await fetch('http://localhost:11434/api/pull', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ name: model }),
              cache: 'no-store'
            });
            
            if (pullResponse.ok) {
              console.log(`Model ${model} pulled successfully`);
              modelAvailable = true;
            } else {
              console.warn(`Failed to pull model ${model}: ${pullResponse.status} ${pullResponse.statusText}`);
            }
          } catch (pullError) {
            console.warn(`Error pulling model ${model}:`, pullError);
          }
        }
      } else {
        console.warn(`Model check failed: ${modelCheck.status} ${modelCheck.statusText}`);
      }
    } catch (error) {
      console.warn('Model check failed:', error);
    }
    
    if (!modelAvailable) {
      throw new Error(`Model ${model} is not available. Please ensure Ollama is running and the model is installed.`);
    }
    
    // Prepare the request body
    const requestBody = {
      model,
      input: inputs
    };
    
    console.log(`Making API request to Ollama for ${inputs.length} inputs...`);
    
    // Make the API request to Ollama
    const response = await fetch('http://localhost:11434/api/embed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      cache: 'no-store' // Ensure we don't cache the response
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Ollama API error response: ${errorText}`);
      throw new Error(`Ollama API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    // Parse the response
    const data = await response.json();
    console.log(`Received embeddings response with ${data.embeddings.length} embeddings`);
    
    // Return the embeddings
    return data.embeddings;
  } catch (error) {
    console.error('Error generating Ollama embeddings:', error);
    throw error;
  }
}

/**
 * Generate a single embedding using the Ollama API
 * @param text Text to generate embedding for
 * @param model Name of the model to use (default: all-minilm)
 * @returns Embedding vector
 */
export async function generateOllamaEmbedding(
  text: string,
  model: string = 'all-minilm'
): Promise<number[]> {
  console.log(`Generating single Ollama embedding for text length: ${text.length} characters`);
  const embeddings = await generateOllamaEmbeddings(text, model);
  console.log(`Generated embedding with ${embeddings[0].length} dimensions`);
  return embeddings[0]; // Return the first (and only) embedding
} 