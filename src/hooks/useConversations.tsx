import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Conversation, Message, DEFAULT_MODEL, MessageRole, ContentType } from '@/types/chat';
import { useToast } from '@/hooks/use-toast';

// Helper to cast database rows to our types
function toConversation(row: Record<string, unknown>): Conversation {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    title: row.title as string,
    model_default: row.model_default as string,
    metadata: row.metadata as Record<string, unknown> | null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function toMessage(row: Record<string, unknown>): Message {
  return {
    id: row.id as string,
    conversation_id: row.conversation_id as string,
    role: row.role as MessageRole,
    content: row.content as string,
    content_type: row.content_type as ContentType,
    metadata: row.metadata as Record<string, unknown> | null,
    created_at: row.created_at as string,
  };
}

export function useConversations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations((data || []).map(toConversation));
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch messages for current conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []).map(toMessage));
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, []);

  // Create new conversation
  const createConversation = useCallback(async (model?: string) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title: 'New Chat',
          model_default: model || DEFAULT_MODEL,
        })
        .select()
        .single();

      if (error) throw error;
      
      const conversation = toConversation(data);
      setConversations(prev => [conversation, ...prev]);
      setCurrentConversation(conversation);
      setMessages([]);
      return conversation;
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to create conversation',
        variant: 'destructive',
      });
      return null;
    }
  }, [user, toast]);

  // Update conversation title
  const updateConversationTitle = useCallback(async (id: string, title: string) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ title })
        .eq('id', id);

      if (error) throw error;
      
      setConversations(prev => 
        prev.map(c => c.id === id ? { ...c, title } : c)
      );
      
      if (currentConversation?.id === id) {
        setCurrentConversation(prev => prev ? { ...prev, title } : null);
      }
    } catch (error) {
      console.error('Error updating conversation:', error);
    }
  }, [currentConversation]);

  // Delete conversation
  const deleteConversation = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setConversations(prev => prev.filter(c => c.id !== id));
      
      if (currentConversation?.id === id) {
        setCurrentConversation(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete conversation',
        variant: 'destructive',
      });
    }
  }, [currentConversation, toast]);

  // Select conversation
  const selectConversation = useCallback(async (conversation: Conversation) => {
    setCurrentConversation(conversation);
    await fetchMessages(conversation.id);
  }, [fetchMessages]);

  // Add message to current conversation
  const addMessage = useCallback(async (
    role: 'user' | 'assistant',
    content: string,
    contentType: 'text' | 'code' | 'image' = 'text'
  ) => {
    if (!currentConversation) return null;

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: currentConversation.id,
          role,
          content,
          content_type: contentType,
        })
        .select()
        .single();

      if (error) throw error;
      
      const message = toMessage(data);
      setMessages(prev => [...prev, message]);
      
      // Update conversation title if it's the first user message
      if (role === 'user' && messages.length === 0) {
        const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
        await updateConversationTitle(currentConversation.id, title);
      }

      return message;
    } catch (error) {
      console.error('Error adding message:', error);
      return null;
    }
  }, [currentConversation, messages.length, updateConversationTitle]);

  // Create an assistant draft message (stable id for streaming UI)
  const createAssistantDraft = useCallback(async () => {
    if (!currentConversation) return null;

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: currentConversation.id,
          role: 'assistant',
          content: '',
          content_type: 'text',
          metadata: { draft: true },
        })
        .select()
        .single();

      if (error) throw error;

      const message = toMessage(data);
      setMessages(prev => {
        if (prev.some(m => m.id === message.id)) return prev;
        return [...prev, message];
      });

      return message;
    } catch (error) {
      console.error('Error creating assistant draft:', error);
      return null;
    }
  }, [currentConversation]);

  // Update message content in DB + local state (used to finalize streaming)
  const updateMessageContent = useCallback(async (messageId: string, content: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ content, metadata: null })
        .eq('id', messageId);

      if (error) throw error;

      setMessages(prev => prev.map(m => (m.id === messageId ? { ...m, content } : m)));
      return true;
    } catch (error) {
      console.error('Error updating message content:', error);
      return false;
    }
  }, []);

  // Filter conversations by search
  const filteredConversations = conversations.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Set up realtime subscription for messages
  useEffect(() => {
    if (!currentConversation) return;

    const channel = supabase
      .channel(`messages-${currentConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${currentConversation.id}`,
        },
        (payload) => {
          const newMessage = toMessage(payload.new as Record<string, unknown>);
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentConversation]);

  // Initial fetch
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return {
    conversations: filteredConversations,
    currentConversation,
    messages,
    loading,
    searchQuery,
    setSearchQuery,
    createConversation,
    selectConversation,
    deleteConversation,
    addMessage,
    createAssistantDraft,
    updateMessageContent,
    setMessages,
  };
}
