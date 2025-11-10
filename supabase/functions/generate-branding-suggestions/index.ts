import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyName, industry, description } = await req.json();
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const prompt = `You must respond with ONLY a valid JSON array. No explanations, no markdown, no code blocks.

Generate 3 creative and professional suggestions with these exact requirements:
- App Name: maximum 15 characters including spaces
- Tag Line: maximum 26 characters including spaces

Context:
- Company: ${companyName || 'Not provided'}
- Industry: ${industry || 'Agriculture/AgriTech'}
- Description: ${description || 'A platform empowering farmers with technology'}

Requirements:
- App names must be memorable, unique, and under 15 characters
- Tag lines must be catchy, descriptive, and under 26 characters
- Both should be professional and suitable for a SaaS platform
- Focus on agriculture, technology, and empowerment themes

Response format (return ONLY this, nothing else):
[
  {"appName": "Example1", "tagLine": "Example tagline one"},
  {"appName": "Example2", "tagLine": "Example tagline two"},
  {"appName": "Example3", "tagLine": "Example tagline three"}
]`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are a creative branding expert specializing in AgriTech and SaaS platforms. Generate concise, memorable brand names and taglines.'
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    console.log('Raw OpenAI content:', content);
    
    // Parse the JSON response
    let suggestions;
    try {
      // Remove markdown code blocks, extra whitespace, and any text before/after JSON
      let cleanContent = content.trim();
      
      // Remove markdown code blocks
      cleanContent = cleanContent.replace(/```json\n?/gi, '').replace(/```\n?/g, '');
      
      // Find JSON array in the content (handles cases where AI adds extra text)
      const jsonMatch = cleanContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        cleanContent = jsonMatch[0];
      }
      
      console.log('Cleaned content:', cleanContent);
      suggestions = JSON.parse(cleanContent);
      
      if (!Array.isArray(suggestions) || suggestions.length === 0) {
        throw new Error('Response is not a valid array');
      }
    } catch (parseError) {
      console.error('Parse error:', parseError);
      console.error('Failed to parse AI response. Content was:', content);
      throw new Error('Failed to parse AI suggestions');
    }

    // Validate and ensure character limits
    const validatedSuggestions = suggestions.map((s: any) => ({
      appName: s.appName?.substring(0, 15) || '',
      tagLine: s.tagLine?.substring(0, 26) || ''
    }));

    return new Response(
      JSON.stringify({ suggestions: validatedSuggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-branding-suggestions:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        suggestions: []
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
