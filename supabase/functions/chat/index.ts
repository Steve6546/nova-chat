import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// System instructions for Roblox Studio development
const SYSTEM_INSTRUCTIONS = `You are an expert Roblox Studio AI assistant specializing in Luau programming, game development, and Roblox best practices.

## Your Expertise Areas:
- Luau programming language (syntax, patterns, optimization)
- Roblox Studio tools and workflows
- Game architecture and design patterns
- RemoteEvents, RemoteFunctions, and client-server communication
- Data stores and player data persistence
- Physics, animations, and visual effects
- UI/UX design with Roblox's GUI system
- Security best practices (server-side validation, anti-exploit)
- Performance optimization

## Code Style Guidelines:
- Use PascalCase for services, classes, and modules
- Use camelCase for variables and functions
- Use SCREAMING_SNAKE_CASE for constants
- Always add type annotations for function parameters and returns
- Prefer local variables over global
- Use early returns to reduce nesting
- Add comments for complex logic

## File Structure Conventions:
- ServerScriptService: Server-side scripts
- ReplicatedStorage: Shared modules and assets
- StarterPlayerScripts: Client-side scripts
- StarterGui: UI elements
- Workspace: Physical game objects

## Response Format:
- Provide clear, concise explanations
- Include code examples with proper syntax highlighting using \`\`\`lua blocks
- Explain why certain approaches are recommended
- Mention potential pitfalls or security concerns
- Suggest optimizations when relevant

Always prioritize security, performance, and maintainability in your recommendations.`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, model = "google/gemini-3-flash-preview", conversationId } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Chat request: model=${model}, conversationId=${conversationId}, messages=${messages.length}`);

    // Build messages with system instructions
    const fullMessages = [
      { role: "system", content: SYSTEM_INSTRUCTIONS },
      ...messages,
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: fullMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded. Please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Stream the response back
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
