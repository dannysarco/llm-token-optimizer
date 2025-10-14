# Claude Sonnet 4.5 Token Optimizer

Optimize your Claude prompts to reduce token usage and API costs. This tool uses Claude Sonnet 4.5 to rewrite prompts while preserving their meaning, helping you save on API expenses.

![Claude Token Optimizer](https://img.shields.io/badge/Claude-Sonnet%204.5-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Live Token Counting** - Real-time token count as you type
- **Prompt Optimization** - AI-powered prompt compression using Claude Sonnet 4.5
- **Cost Analysis** - Detailed breakdown of API costs and potential savings
- **Session Statistics** - Track optimizations, costs, and savings over time
- **Visual Analytics** - Cumulative cost graph to visualize API usage
- **Export History** - Download your optimization history as JSON
- **Local Token Counting** - Fast, accurate token counting using Anthropic's official tokenizer

## Pricing

- **Input Tokens:** $3.00 per million tokens
- **Output Tokens:** $15.00 per million tokens

## Screenshots

### Main Interface
The optimizer provides a clean, intuitive interface for optimizing prompts:
- Real-time token counting in the textarea
- One-click optimization with detailed results
- Copy button for quick prompt copying

### Optimization Results
View detailed information about each optimization:
- Original vs optimized token counts
- Percentage reduction in tokens
- API usage breakdown (input/output tokens)
- Cost analysis and estimated savings

### Session Statistics
Track your usage over time:
- Total prompts optimized
- Cumulative API costs
- Total tokens saved
- Estimated savings
- Visual graph of cumulative costs

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Anthropic API key

## Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd claude-token-optimizer
   ```

2. **Install all dependencies**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the `backend` directory:
   ```bash
   cd backend
   touch .env
   ```
   
   Add your Anthropic API key:
   ```env
   ANTHROPIC_API_KEY=your_api_key_here
   PORT=5001
   ```

## Usage

### Quick Start (Both Backend & Frontend)

From the root directory:
```bash
npm start
```

This will start both the backend server (port 5001) and frontend React app (port 3000).

### Individual Commands

**Backend only:**
```bash
npm run start:backend
```

**Frontend only:**
```bash
npm run start:frontend
```

### Traditional Method

**Backend:**
```bash
cd backend
node index.js
```

**Frontend:**
```bash
cd frontend
npm start
```

## Project Structure

```
claude-token-optimizer/
├── backend/
│   ├── index.js           # Express server with API endpoints
│   ├── package.json       # Backend dependencies
│   └── .env              # Environment variables (not committed)
├── frontend/
│   ├── src/
│   │   └── App.tsx       # React application
│   └── package.json      # Frontend dependencies
├── package.json          # Root package with helper scripts
└── README.md
```

## API Endpoints

### `POST /api/count_tokens`
Count tokens in a prompt using Anthropic's official tokenizer.

**Request:**
```json
{
  "prompt": "Your prompt text here"
}
```

**Response:**
```json
{
  "tokens": 42
}
```

### `POST /api/optimize_prompt`
Optimize a prompt to reduce token usage while preserving meaning.

**Request:**
```json
{
  "prompt": "Your long prompt text here"
}
```

**Response:**
```json
{
  "optimized": "Shorter optimized prompt",
  "usage": {
    "input_tokens": 100,
    "output_tokens": 50
  },
  "originalTokens": 100,
  "optimizedTokens": 75,
  "savings": 25,
  "savingsPercentage": 25
}
```

### `GET /health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "model": "claude-sonnet-4-5-20250929"
}
```

## Features in Detail

### Local Token Counting
Uses `@anthropic-ai/tokenizer` for instant, accurate token counting without API calls:
- No network latency
- Zero API costs for counting
- Consistent with Claude's actual tokenization

### Session Persistence
All optimization history is stored in browser localStorage:
- Survives page refreshes
- Tracks cumulative costs and savings
- Export functionality for record keeping

### Cost Calculation
Accurate cost tracking based on current Sonnet 4.5 pricing:
- Input token costs
- Output token costs
- Estimated savings per optimization
- Cumulative session totals

## Development

### Adding Features

The project uses a simple structure:
- **Backend:** Express.js API in `backend/index.js`
- **Frontend:** React + TypeScript in `frontend/src/App.tsx`

### Environment Variables

Backend supports:
- `ANTHROPIC_API_KEY` - Your Anthropic API key (required)
- `PORT` - Backend server port (default: 5001)

## Troubleshooting

### "Failed to count tokens"
- Ensure backend is running on port 5001
- Check that `@anthropic-ai/tokenizer` is installed in backend

### "Failed to optimize prompt"
- Verify your `ANTHROPIC_API_KEY` is valid in `backend/.env`
- Check backend console for detailed error messages
- Ensure you have API credits available

### CORS Errors
- Backend uses CORS middleware to allow frontend connections
- Default setup allows all origins for development
- Modify `cors()` configuration in `backend/index.js` for production

## License

MIT

## Contributing

Made with ❤️ by Danny Sarco. Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

- Uses [@anthropic-ai/tokenizer](https://www.npmjs.com/package/@anthropic-ai/tokenizer) for accurate token counting
- React + TypeScript for the frontend
- Express.js for the backend

---

**Note:** This tool is for optimization purposes. Always review optimized prompts to ensure they maintain the intended meaning and context for your specific use case.
