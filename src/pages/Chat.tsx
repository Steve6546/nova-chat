import { useState, useRef, useEffect, useMemo } from 'react';
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
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const rafRef = useRef<number | null>(null);
  const latestContentRef = useRef('');

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
    createAssistantDraft,
    updateMessageContent,
    setMessages,
  } = useConversations();

  const lastMessageId = useMemo(() => messages[messages.length - 1]?.id ?? null, [messages]);

  // Scroll to bottom when a new message is appended
  useEffect(() => {
    if (!lastMessageId) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lastMessageId]);

  // Cleanup any in-flight streaming on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const updateDraftContentThrottled = (messageId: string, content: string) => {
    latestContentRef.current = content;
    if (rafRef.current) return;

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const next = latestContentRef.current;

      setMessages(prev => prev.map(m => (m.id === messageId ? { ...m, content: next } : m)));
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    });
  };

  // Handle sending a message
  const handleSendMessage = async (content: string) => {
    if (isStreaming) return;

    // Create conversation if none exists
    let conversationId = currentConversation?.id;
    if (!conversationId) {
      const newConvo = await createConversation(selectedModel);
      if (!newConvo) return;
      conversationId = newConvo.id;
    }

    // Snapshot history BEFORE we mutate local message state
    const historyForRequest = [...messages, { role: 'user' as const, content }].map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Persist user message - using override to fix first-message bug
    await addMessage('user', content, 'text', conversationId);

    // Create assistant draft message (stable identity during + after stream)
    const draft = await createAssistantDraft(conversationId);
    if (!draft) {
      toast({
        title: 'Error',
        description: 'Failed to create assistant message. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    setIsStreaming(true);
    setStreamingMessageId(draft.id);

    const controller = new AbortController();
    abortRef.current = controller;

    let textBuffer = '';
    let fullContent = '';

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
            messages: historyForRequest,
            model: selectedModel,
            conversationId,
          }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          toast({
            title: 'Rate Limited',
            description: 'Too many requests. Please wait a moment and try again.',
            variant: 'destructive',
          });
          return;
        }
        if (response.status === 402) {
          toast({
            title: 'Credits Required',
            description: 'Please add credits to your workspace to continue.',
            variant: 'destructive',
          });
          return;
        }
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();

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
            if (!delta) continue;

            fullContent += delta;
            updateDraftContentThrottled(draft.id, fullContent);
          } catch {
            // Re-buffer incomplete JSON
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      if (fullContent) {
        await updateMessageContent(draft.id, fullContent);
      }
    } catch (error) {
      if ((error as any)?.name !== 'AbortError') {
        console.error('Error sending message:', error);
        toast({
          title: 'Error',
          description: 'Failed to get AI response. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      abortRef.current = null;
      setIsStreaming(false);
      setStreamingMessageId(null);
    }
  };

  // Handle image generation request
  const handleImageRequest = async (prompt: string) => {
    if (isStreaming) return;

    // Create conversation if none exists
    let conversationId = currentConversation?.id;
    if (!conversationId) {
      const newConvo = await createConversation('google/gemini-3-pro-image-preview');
      if (!newConvo) return;
      conversationId = newConvo.id;
    }

    // Add user message - using override to fix first-message bug
    await addMessage('user', `Generate image: ${prompt}`, 'text', conversationId);
    setIsStreaming(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { prompt, conversationId },
      });

      if (error) throw error;

      if (data?.imageUrl) {
        await addMessage('assistant', data.imageUrl, 'image', conversationId);
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

  const streamingDraft = streamingMessageId
    ? messages.find(m => m.id === streamingMessageId)
    : null;

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
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isStreaming={message.id === streamingMessageId}
                />
              ))}

              {isStreaming && streamingDraft && !streamingDraft.content && <TypingIndicator />}

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
