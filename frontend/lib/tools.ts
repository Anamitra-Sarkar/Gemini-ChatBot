export type ToolId = 'chat' | 'canvas' | 'study' | 'image' | 'video' | 'search';

export interface Tool {
  id: ToolId;
  name: string;
  description: string;
  icon: string;
  available: boolean;
}

export const tools: Tool[] = [
  {
    id: 'chat',
    name: 'Chat',
    description: 'Conversational AI assistant',
    icon: 'MessageSquare',
    available: true,
  },
  {
    id: 'canvas',
    name: 'Canvas',
    description: 'Long-form writing workspace',
    icon: 'FileText',
    available: true,
  },
  {
    id: 'study',
    name: 'Study & Learn',
    description: 'Generate flashcards and quizzes',
    icon: 'BookOpen',
    available: true,
  },
  {
    id: 'image',
    name: 'Image Generation',
    description: 'Create images from text',
    icon: 'Image',
    available: true,
  },
  {
    id: 'video',
    name: 'Video Generation',
    description: 'Generate videos from prompts',
    icon: 'Video',
    available: true,
  },
  {
    id: 'search',
    name: 'Web Search',
    description: 'Search the internet',
    icon: 'Globe',
    available: true,
  },
];

export function getToolById(id: ToolId): Tool | undefined {
  return tools.find(t => t.id === id);
}
