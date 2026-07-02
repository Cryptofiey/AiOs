export async function fetchNemotronResponse(apiKey: string, messages: any[], model: string = "meta/llama-3.1-70b-instruct") {
  const url = "https://integrate.api.nvidia.com/v1/chat/completions";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Nemotron API Error: ${response.status} ${response.statusText} - ${text}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export class NvidiaClient {
  private apiKeys: string[] = [];
  private currentKeyIndex: number = 0;
  private defaultModel: string;

  constructor(apiKeyOrKeys?: string | string[], defaultModel: string = "meta/llama-3.1-70b-instruct") {
    // Collect keys passed in
    if (Array.isArray(apiKeyOrKeys)) {
      this.apiKeys = apiKeyOrKeys.filter(Boolean);
    } else if (apiKeyOrKeys) {
      this.apiKeys = [apiKeyOrKeys];
    }

    // Always attempt discovery from process.env as well
    const envKeys = [
      process.env.NVIDIA_API_KEY,
      process.env.NVIDIA_API_KEY_1,
      process.env.NVIDIA_API_KEY_2,
      process.env.NVIDIA_API_KEY_3
    ].filter((k): k is string => typeof k === "string" && k.trim() !== "");

    for (const k of envKeys) {
      if (!this.apiKeys.includes(k)) {
        this.apiKeys.push(k);
      }
    }

    this.defaultModel = defaultModel;
  }

  public models = {
    generateContent: async (args: { model?: string, contents: string, config?: any }) => {
      // Ignore gemini models and force Nvidia default model if gemini was requested
      const model = (args.model && args.model.includes('gemini')) ? this.defaultModel : (args.model || this.defaultModel);
      
      // Keep the original requested model unless it's explicitly an unavailable legacy alias
      let finalModel = model;
      // The nvidia/llama-3.1-nemotron-70b-instruct model seems to return 404 recently, 
      // map it to the stable meta/llama-3.1-70b-instruct to fix the 404 Error.
      if (finalModel === "nvidia/llama-3.1-nemotron-70b-instruct") {
        finalModel = "meta/llama-3.1-70b-instruct";
      }
      
      const url = "https://integrate.api.nvidia.com/v1/chat/completions";
      
      let systemPrompt = "";
      if (args.config?.systemInstruction) {
        systemPrompt = typeof args.config.systemInstruction === 'string' 
          ? args.config.systemInstruction 
          : (args.config.systemInstruction.parts?.[0]?.text || "");
      }
      
      if (args.config?.responseMimeType === "application/json") {
         systemPrompt += (systemPrompt ? "\n\n" : "") + "You must respond with valid JSON only.";
      }

      const messages: any[] = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: args.contents });

      let requestMaxTokens = 1024;
      if (finalModel.includes('70b')) {
         requestMaxTokens = 2048;
      }
      
      const bodyPayload: any = {
        model: finalModel,
        messages,
        temperature: 0.7,
        max_tokens: requestMaxTokens,
      };

      if (this.apiKeys.length === 0) {
        throw new Error("No NVIDIA API Keys available or configured.");
      }

      let lastError: any = null;
      let success = false;
      let data: any = null;

      // Rotate and failover through available keys
      for (let i = 0; i < this.apiKeys.length; i++) {
        const keyIndex = (this.currentKeyIndex + i) % this.apiKeys.length;
        const apiKey = this.apiKeys[keyIndex];

        console.log(`[NvidiaClient] Attempting API call using key index: ${keyIndex} (of ${this.apiKeys.length})`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s max for the fetch request

        try {
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify(bodyPayload),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const text = await response.text();
            throw new Error(`Status ${response.status}: ${text}`);
          }

          data = await response.json();
          this.currentKeyIndex = keyIndex; // Store the successful index
          success = true;
          break;
        } catch (err: any) {
          clearTimeout(timeoutId);
          console.warn(`[NvidiaClient] Key at index ${keyIndex} failed or rate-limited:`, err.message || err);
          lastError = err;
          // Continue to next key in loop
        }
      }

      if (!success) {
        throw new Error(`[NvidiaClient] All available ${this.apiKeys.length} Nvidia API keys failed or were exhausted. Last error: ${lastError?.message || lastError}`);
      }

      let text = data.choices && data.choices.length > 0 ? data.choices[0].message.content : "";
      
      // Clean up json formatting if responseMimeType is json but model wrapped it in markdown
      if (args.config?.responseMimeType === "application/json") {
         let cleanedText = text.replace(/```json/gi, "").replace(/```/g, "").trim();
         
         // Try to extract JSON from text if there's conversational garbage
         const jsonStart = cleanedText.indexOf('{');
         const jsonStartChar = cleanedText.indexOf('[');
         
         // Use the earliest structure
         let startIdx = -1;
         if (jsonStart !== -1 && jsonStartChar !== -1) {
            startIdx = Math.min(jsonStart, jsonStartChar);
         } else {
            startIdx = jsonStart !== -1 ? jsonStart : jsonStartChar;
         }
         
         let endIdx = -1;
         const jsonEnd = cleanedText.lastIndexOf('}');
         const jsonEndChar = cleanedText.lastIndexOf(']');
         if (jsonEnd !== -1 && jsonEndChar !== -1) {
            endIdx = Math.max(jsonEnd, jsonEndChar);
         } else {
            endIdx = jsonEnd !== -1 ? jsonEnd : jsonEndChar;
         }

         if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
            cleanedText = cleanedText.substring(startIdx, endIdx + 1);
         }
         text = cleanedText;
      }

      return {
        text,
        usageMetadata: {
           promptTokenCount: data.usage?.prompt_tokens || 0,
           candidatesTokenCount: data.usage?.completion_tokens || 0
        }
      };
    }
  }
}

