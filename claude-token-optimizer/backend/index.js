require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

const CLAUDE_MODEL = "claude-sonnet-4-5-20250929";
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

// Shared axios instance for Anthropic API calls
const anthropicClient = axios.create({
  baseURL: ANTHROPIC_API_URL,
  headers: {
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': ANTHROPIC_VERSION,
    'content-type': 'application/json'
  }
});

// Util to get token count using Claude's token counting endpoint
async function getTokenCount(prompt) {
  try {
    const response = await anthropicClient.post('', {
      model: CLAUDE_MODEL,
      max_tokens: 1,
      messages: [{ role: "user", content: prompt }]
    });
    return response.data.usage?.input_tokens || 0;
  } catch (err) {
    console.error('Token count error:', err.message);
    // Fallback: rough estimate (1 token ≈ 4 chars for English)
    return Math.ceil(prompt.length / 4);
  }
}

// Token counting endpoint
app.post('/api/count_tokens', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Invalid prompt provided' });
    }
    
    const tokens = await getTokenCount(prompt);
    res.json({ tokens });
  } catch (err) {
    console.error('Count tokens error:', err);
    res.status(500).json({ error: 'Failed to count tokens' });
  }
});

// Prompt optimization endpoint
app.post('/api/optimize_prompt', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Invalid prompt provided' });
    }
    
    const response = await anthropicClient.post('', {
      model: CLAUDE_MODEL,
      max_tokens: 2048, // Increased for longer prompts
      system: "You are a Claude prompt optimizer. Rewrite prompts to preserve meaning while minimizing token count. Return only the optimized prompt with no explanation.",
      messages: [
        { role: "user", content: prompt }
      ]
    });
    
    const optimized = response.data.content?.[0]?.text || "";
    const usage = response.data.usage || {};
    
    res.json({ 
      optimized, 
      usage,
      originalTokens: usage.input_tokens,
      optimizedTokens: await getTokenCount(optimized),
      savings: usage.input_tokens - await getTokenCount(optimized)
    });
  } catch (err) {
    console.error('Optimize prompt error:', err.response?.data || err.message);
    res.status(500).json({ 
      error: 'Failed to optimize prompt',
      details: err.response?.data?.error?.message || err.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', model: CLAUDE_MODEL });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`Claude Optimizer Backend running at http://localhost:${PORT}`);
  console.log(`Using model: ${CLAUDE_MODEL}`);
});