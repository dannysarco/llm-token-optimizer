require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

const CLAUDE_MODEL = "claude-sonnet-4-5-20250929";

// Util to get token count (uses Claude's `/messages` endpoint with system message)
async function getTokenCount(prompt) {
  try {
    // Send dummy message to get token usage for prompt (no actual completion)
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: CLAUDE_MODEL,
        max_tokens: 1, // minimal output
        messages: [{ role: "user", content: prompt }]
      },
      {
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        }
      }
    );
    return response.data.usage?.input_tokens || prompt.split(/\s+/).length;
  } catch (err) {
    // fallback: word count
    return prompt.split(/\s+/).length;
  }
}

// Token counting endpoint
app.post('/api/count_tokens', async (req, res) => {
  try {
    const { prompt } = req.body;
    const tokens = await getTokenCount(prompt);
    res.json({ tokens });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Prompt optimization endpoint
app.post('/api/optimize_prompt', async (req, res) => {
  try {
    const { prompt } = req.body;
    const systemPrompt = "You are a Claude prompt optimizer. Rewrite the following prompt to preserve meaning but use as few tokens as possible. Return only the revised prompt.";
    const messages = [
      { role: "user", content: `${systemPrompt}\n\n${prompt}` }
    ];
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: CLAUDE_MODEL,
        max_tokens: 1024,
        messages
      },
      {
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        }
      }
    );
    const optimized = response.data.content?.[0]?.text || "";
    const usage = response.data.usage || {};
    res.json({ optimized, usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Claude Optimizer Backend running at http://localhost:${PORT}`);
});