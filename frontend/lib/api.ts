// API Service Layer

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export interface HealthResponse {
  status: string;
  checks: {
    firestore?: boolean;
    storage?: boolean;
    gemini?: boolean;
    nano_banana?: boolean;
    veo?: boolean;
    tavily?: boolean;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

export interface Chat {
  id: string;
  title: string;
  createdAt?: number;
  updatedAt?: number;
  model?: string;
}

class APIService {
  private async fetchWithAuth(url: string, options: RequestInit = {}, token?: string) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}${url}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.text().catch(() => response.statusText);
      throw new Error(error || `Request failed: ${response.status}`);
    }

    return response;
  }

  async checkHealth(): Promise<HealthResponse | null> {
    try {
      const response = await fetch(`${BASE_URL}/health`, { cache: 'no-store' });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  async getChats(token?: string): Promise<Chat[]> {
    try {
      const response = await this.fetchWithAuth('/history/chats', {}, token);
      const data = await response.json();
      return data.chats || [];
    } catch (error) {
      console.error('Failed to fetch chats:', error);
      return [];
    }
  }

  async getMessages(chatId: string, token?: string): Promise<ChatMessage[]> {
    try {
      const response = await this.fetchWithAuth(`/history/chats/${chatId}`, {}, token);
      const data = await response.json();
      return data.messages || [];
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      return [];
    }
  }

  async createChat(title: string, token?: string): Promise<{ id: string } | null> {
    try {
      const response = await this.fetchWithAuth(
        '/history/chats',
        {
          method: 'POST',
          body: JSON.stringify({ title }),
        },
        token
      );
      const data = await response.json();
      return { id: data.chat_id };
    } catch (error) {
      console.error('Failed to create chat:', error);
      return null;
    }
  }

  async *streamChat(
    chatId: string | null,
    message: string,
    model: string,
    token?: string,
    signal?: AbortSignal
  ): AsyncGenerator<{ type: 'meta' | 'token' | 'done' | 'error'; data: any }> {
    try {
      const response = await this.fetchWithAuth(
        '/chat/stream',
        {
          method: 'POST',
          body: JSON.stringify({
            chat_id: chatId,
            message,
            model,
            request_id: crypto.randomUUID(),
          }),
          signal,
        },
        token
      );

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          const eventMatch = line.match(/^event:\s*(.+)$/m);
          const dataMatch = line.match(/^data:\s*(.+)$/m);

          if (eventMatch && dataMatch) {
            const event = eventMatch[1].trim();
            const data = JSON.parse(dataMatch[1].trim());

            yield { type: event as any, data };
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        yield { type: 'error', data: { message: 'Request aborted' } };
      } else {
        yield { type: 'error', data: { message: error.message } };
      }
    }
  }
}

export const api = new APIService();
