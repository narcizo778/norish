import { AIProvider } from "./base";

import { parseJsonWithRepair } from "@/lib/helpers";
import { aiLogger } from "@/server/logger";

export interface GenericOpenAIProviderConfig {
  endpoint: string;
  apiKey?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export class GenericOpenAIProvider implements AIProvider {
  name = "Generic OpenAI Compatible";
  private config: GenericOpenAIProviderConfig;

  constructor(config: GenericOpenAIProviderConfig) {
    this.config = config;
  }

  async generateStructuredOutput<T>(
    prompt: string,
    schema: any,
    systemMessage = "Return valid JSON only."
  ): Promise<T | null> {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (this.config.apiKey) {
        headers["Authorization"] = `Bearer ${this.config.apiKey}`;
      }

      const response = await fetch(`${this.config.endpoint}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: this.config.model,
          temperature: this.config.temperature ?? 1.0,
          max_tokens: this.config.maxTokens,
          messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        throw new Error(`Generic OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content?.trim() || "{}";
      const parsed = parseJsonWithRepair(content);

      return (Array.isArray(parsed) ? parsed[0] : parsed) as T;
    } catch (error) {
      aiLogger.error({ err: error, provider: this.name }, "AI provider error");

      return null;
    }
  }
}
