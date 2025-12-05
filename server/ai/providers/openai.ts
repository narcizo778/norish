import OpenAI from "openai";

import { AIProvider } from "./base";

import { parseJsonWithRepair } from "@/lib/helpers";
import { aiLogger } from "@/server/logger";

export interface OpenAIProviderConfig {
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export class OpenAIProvider implements AIProvider {
  name = "OpenAI";
  private client: OpenAI;
  private config: OpenAIProviderConfig;

  constructor(config: OpenAIProviderConfig) {
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.apiKey,
    });
  }

  async generateStructuredOutput<T>(
    prompt: string,
    schema: any,
    systemMessage = "Return valid JSON only."
  ): Promise<T | null> {
    try {
      // Build request parameters
      const requestParams: any = {
        model: this.config.model,
        temperature: this.config.temperature ?? 1.0,
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: schema,
        },
      };

      if (this.config.maxTokens) {
        requestParams.max_completion_tokens = this.config.maxTokens;
      }

      const response = await this.client.chat.completions.create(requestParams);

      const content = response.choices?.[0]?.message?.content?.trim() || "{}";

      if (!content || content === "{}") {
        aiLogger.error({ provider: this.name }, "Empty or null content in response");

        return null;
      }

      const parsed = parseJsonWithRepair(content);

      return (Array.isArray(parsed) ? parsed[0] : parsed) as T;
    } catch (error) {
      aiLogger.error({ err: error, provider: this.name }, "AI provider error");

      return null;
    }
  }
}
