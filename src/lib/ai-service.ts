import OpenAI from 'openai';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export interface AIToolCall {
  function: {
    name: string;
    arguments: string;
  };
}

export interface AIResponse {
  content: string | null;
  tool_calls?: AIToolCall[];
}

export interface AICompletionOptions {
  model?: string;
  messages: AIMessage[];
  temperature?: number;
  max_tokens?: number;
  tools?: AITool[];
  tool_choice?: 'auto' | 'none';
}

class AIService {
  private useBedrockFlag: boolean;
  private openaiClient: OpenAI | null = null;
  private bedrockClient: BedrockRuntimeClient | null = null;

  constructor() {
    this.useBedrockFlag = process.env.BEDROCK_INVOKE === 'true' || process.env.BEDROCK_INVOKE === 'TRUE';
    console.log('AI Service initialized with Bedrock:', this.useBedrockFlag);
  }

  private getOpenAI(): OpenAI {
    if (!this.openaiClient) {
      if (!process.env.NEXT_OPENAI_API_KEY) {
        throw new Error('NEXT_OPENAI_API_KEY environment variable is not set');
      }
      this.openaiClient = new OpenAI({
        apiKey: process.env.NEXT_OPENAI_API_KEY,
      });
    }
    return this.openaiClient;
  }

  private getBedrock(): BedrockRuntimeClient {
    if (!this.bedrockClient) {
      const accessKeyId = process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID;
      const secretAccessKey = process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY;
      const region = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';

      if (!accessKeyId || !secretAccessKey) {
        throw new Error('AWS credentials not configured for Bedrock');
      }

      this.bedrockClient = new BedrockRuntimeClient({
        region: region,
        credentials: {
          accessKeyId: accessKeyId,
          secretAccessKey: secretAccessKey,
        },
      });
    }
    return this.bedrockClient;
  }

  private mapOpenAIModelToBedrock(openaiModel: string): string {
    const modelMapping: Record<string, string> = {
      'gpt-4': 'anthropic.claude-3-5-sonnet-20241022-v2:0',
      'gpt-4o': 'anthropic.claude-3-5-sonnet-20241022-v2:0',
      'gpt-4-turbo': 'anthropic.claude-3-5-sonnet-20241022-v2:0',
      'gpt-3.5-turbo': 'anthropic.claude-3-5-sonnet-20241022-v2:0', // Using latest Claude for all
    };
    
    return modelMapping[openaiModel] || 'anthropic.claude-3-5-sonnet-20241022-v2:0';
  }

  private convertToolsToClaudeFormat(tools?: AITool[]): string {
    if (!tools || tools.length === 0) return '';
    
    const toolDescriptions = tools.map(tool => 
      `Function: ${tool.function.name}\nDescription: ${tool.function.description}\nParameters: ${JSON.stringify(tool.function.parameters, null, 2)}`
    ).join('\n\n');
    
    return `\n\nYou have access to the following tools. When you want to use a tool, respond with a JSON object in this exact format:
{
  "tool_call": {
    "function": {
      "name": "function_name",
      "arguments": "{\\"param1\\": \\"value1\\", \\"param2\\": \\"value2\\"}"
    }
  }
}

Available tools:
${toolDescriptions}

If you don't need to use any tools, just respond normally with text.`;
  }

  private async callBedrock(options: AICompletionOptions): Promise<AIResponse> {
    const bedrockClient = this.getBedrock();
    const model = this.mapOpenAIModelToBedrock(options.model || 'gpt-4');

    // Convert messages to Claude format
    let prompt = '';
    let systemMessage = '';

    for (const message of options.messages) {
      if (message.role === 'system') {
        systemMessage = message.content;
      } else if (message.role === 'user') {
        prompt += `Human: ${message.content}\n\n`;
      } else if (message.role === 'assistant') {
        prompt += `Assistant: ${message.content}\n\n`;
      }
    }

    // Add system message and tools to the prompt
    let finalPrompt = '';
    if (systemMessage) {
      finalPrompt += `${systemMessage}\n\n`;
    }
    if (options.tools) {
      finalPrompt += this.convertToolsToClaudeFormat(options.tools);
      finalPrompt += '\n\n';
    }
    finalPrompt += prompt;
    finalPrompt += 'Assistant: ';

    const payload = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: options.max_tokens || 3000,
      messages: [
        {
          role: "user",
          content: finalPrompt
        }
      ],
      temperature: options.temperature || 0.1,
    };

    console.log('Bedrock request payload:', JSON.stringify(payload, null, 2));

    const command = new InvokeModelCommand({
      modelId: model,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    console.log('Bedrock response:', responseBody);

    const content = responseBody.content[0]?.text || '';

    // Check if the response contains a tool call
    let toolCall: AIToolCall | undefined;
    try {
      // Look for JSON objects in the response that might be tool calls
      const jsonMatch = content.match(/\\{[^}]*"tool_call"[^}]*\\}.*?\\}/s);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.tool_call && parsed.tool_call.function) {
          toolCall = parsed.tool_call;
        }
      }
    } catch (e) {
      // No tool call found, treat as regular response
    }

    return {
      content: content,
      tool_calls: toolCall ? [toolCall] : undefined
    };
  }

  private async callOpenAI(options: AICompletionOptions): Promise<AIResponse> {
    const openai = this.getOpenAI();
    
    const requestOptions: any = {
      model: options.model || 'gpt-4o',
      messages: options.messages,
      temperature: options.temperature || 0.1,
      max_tokens: options.max_tokens || 3000,
    };

    // Only add tools and tool_choice if tools are provided
    if (options.tools && options.tools.length > 0) {
      requestOptions.tools = options.tools;
      requestOptions.tool_choice = options.tool_choice || 'auto';
    }
    
    const completion = await openai.chat.completions.create(requestOptions);

    const responseMessage = completion.choices[0].message;
    
    return {
      content: responseMessage.content,
      tool_calls: responseMessage.tool_calls as AIToolCall[]
    };
  }

  async createCompletion(options: AICompletionOptions): Promise<AIResponse> {
    try {
      if (this.useBedrockFlag) {
        console.log('Using Bedrock for AI completion');
        return await this.callBedrock(options);
      } else {
        console.log('Using OpenAI for AI completion');
        return await this.callOpenAI(options);
      }
    } catch (error) {
      console.error(`AI Service (${this.useBedrockFlag ? 'Bedrock' : 'OpenAI'}) error:`, error);
      throw error;
    }
  }

  // Simple text completion method for basic use cases
  async complete(prompt: string, systemPrompt?: string, options?: Partial<AICompletionOptions>): Promise<string> {
    const messages: AIMessage[] = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    
    messages.push({ role: 'user', content: prompt });

    const response = await this.createCompletion({
      ...options,
      messages,
    });

    return response.content || '';
  }

  // Check which AI service is currently active
  getCurrentProvider(): 'openai' | 'bedrock' {
    return this.useBedrockFlag ? 'bedrock' : 'openai';
  }
}

// Export a singleton instance
export const aiService = new AIService();

// Legacy function for backward compatibility
export function getOpenAI(): OpenAI {
  return new AIService().getOpenAI();
}