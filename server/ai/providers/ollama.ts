import { AIProvider } from "./base";

import { parseJsonWithRepair } from "@/lib/helpers";
import { aiLogger } from "@/server/logger";

export interface OllamaProviderConfig {
  endpoint: string;
  model: string;
  temperature?: number;
}

export class OllamaProvider implements AIProvider {
  name = "Ollama";
  private config: OllamaProviderConfig;

  constructor(config: OllamaProviderConfig) {
    this.config = config;
  }

  async generateStructuredOutput<T>(
    prompt: string,
    schema: any,
    systemMessage = "Return valid JSON only."
  ): Promise<T | null> {
    try {
      const fullPrompt = `${systemMessage}\n\n${prompt}`;

      const response = await fetch(`${this.config.endpoint}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.config.model,
          prompt: fullPrompt,
          stream: false,
          format: "json",
          options: {
            temperature: this.config.temperature ?? 1.0,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.response?.trim() || "{}";
      const parsed = parseJsonWithRepair(content);

      return (Array.isArray(parsed) ? parsed[0] : parsed) as T;
    } catch (error) {
      aiLogger.error({ err: error, provider: this.name }, "AI provider error");

      return null;
    }
  }
}
