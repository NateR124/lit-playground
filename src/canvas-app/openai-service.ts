// src/canvas-app/openai-service.ts

export interface OpenAIResponse {
  text: string;
  error?: string;
}

export class OpenAIService {
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async generateCompletion(systemPrompt: string, userPrompt: string): Promise<OpenAIResponse> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4', // or your preferred model
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: userPrompt
            }
          ],
          temperature: 0.7
        })
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      return {
        text: data.choices[0].message.content
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      return {
        text: '',
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      };
    }
  }
  
  // For streaming responses (optional enhancement)
  async streamCompletion(
    systemPrompt: string, 
    userPrompt: string, 
    onChunk: (chunk: string) => void,
    onComplete: (fullText: string) => void,
    onError: (error: string) => void
  ) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: userPrompt
            }
          ],
          temperature: 0.7,
          stream: true
        })
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response body reader not available');
      
      const decoder = new TextDecoder('utf-8');
      let fullText = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '' && line.trim() !== 'data: [DONE]');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const json = JSON.parse(line.substring(6));
              if (json.choices && json.choices[0].delta.content) {
                const content = json.choices[0].delta.content;
                fullText += content;
                onChunk(content);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
      
      onComplete(fullText);
    } catch (error) {
      console.error('OpenAI streaming error:', error);
      onError(error instanceof Error ? error.message : 'An unknown error occurred');
    }
  }
}