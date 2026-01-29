import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ConversationSidebar } from '@/components/chat/ConversationSidebar';
import { ChatMessage, TypingIndicator } from '@/components/chat/ChatMessage';
import { MessageComposer } from '@/components/chat/MessageComposer';
import { EmptyState } from '@/components/chat/EmptyState';
import { useConversations } from '@/hooks/useConversations';
import { DEFAULT_MODEL, Message } from '@/types/chat';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const {
    conversations,
    currentConversation,
    messages,
    searchQuery,
    setSearchQuery,
    createConversation,
    selectConversation,
    deleteConversation,
    addMessage,
    setMessages,
  } = useConversations();

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Handle sending a message
  const handleSendMessage = async (content: string) => {
    // Create conversation if none exists
    let conversationId = currentConversation?.id;
    if (!conversationId) {
      const newConvo = await createConversation(selectedModel);
      if (!newConvo) return;
      conversationId = newConvo.id;
    }

    // Add user message
    await addMessage('user', content);

    // Start streaming response
    setIsStreaming(true);
    setStreamingContent('');

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [...messages, { role: 'user', content }].map(m => ({
              role: m.role,
              content: m.content,
            })),
            model: selectedModel,
            conversationId,
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          toast({
            title: 'Rate Limited',
            description: 'Too many requests. Please wait a moment and try again.',
            variant: 'destructive',
          });
          setIsStreaming(false);
          return;
        }
        if (response.status === 402) {
          toast({
            title: 'Credits Required',
            description: 'Please add credits to your workspace to continue.',
            variant: 'destructive',
          });
          setIsStreaming(false);
          return;
        }
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let fullContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          textBuffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);

            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (line.startsWith(':') || line.trim() === '') continue;
            if (!line.startsWith('data: ')) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(jsonStr);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                fullContent += delta;
                setStreamingContent(fullContent);
              }
            } catch {
              // Re-buffer incomplete JSON
              textBuffer = line + '\n' + textBuffer;
              break;
            }
          }
        }
      }

      // Add assistant message to database
      if (fullContent) {
        await addMessage('assistant', fullContent);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to get AI response. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
    }
  };

  // Handle image generation request
  const handleImageRequest = async (prompt: string) => {
    // Create conversation if none exists
    let conversationId = currentConversation?.id;
    if (!conversationId) {
      const newConvo = await createConversation('google/gemini-3-pro-image-preview');
      if (!newConvo) return;
      conversationId = newConvo.id;
    }

    // Add user message
    await addMessage('user', `Generate image: ${prompt}`);
    setIsStreaming(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { prompt, conversationId },
      });

      if (error) throw error;

      if (data?.imageUrl) {
        await addMessage('assistant', data.imageUrl, 'image');
      }
    } catch (error) {
      console.error('Error generating image:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate image. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsStreaming(false);
    }
  };

  // Handle starting chat from empty state
  const handleStartChat = async (prompt: string) => {
    await handleSendMessage(prompt);
  };

  // Create streaming message for display
  const displayMessages = [...messages];
  if (isStreaming && streamingContent) {
    displayMessages.push({
      id: 'streaming',
      conversation_id: currentConversation?.id || '',
      role: 'assistant',
      content: streamingContent,
      content_type: 'text',
      created_at: new Date().toISOString(),
    } as Message);
  }

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Sidebar */}
      <ConversationSidebar
        conversations={conversations}
        currentConversation={currentConversation}
        isOpen={sidebarOpen}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSelectConversation={selectConversation}
        onNewConversation={() => createConversation(selectedModel)}
        onDeleteConversation={deleteConversation}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <ChatHeader
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
        />

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto">
          {currentConversation ? (
            <div className="max-w-4xl mx-auto">
              {displayMessages.map((message, index) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isStreaming={message.id === 'streaming'}
                />
              ))}
              
              {isStreaming && !streamingContent && (
                <TypingIndicator />
              )}
              
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <EmptyState onStartChat={handleStartChat} />
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-border p-4 bg-card/50 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto">
            <MessageComposer
              onSend={handleSendMessage}
              onImageRequest={handleImageRequest}
              disabled={isStreaming}
              placeholder={currentConversation ? "Type a message..." : "Start a new conversation..."}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
