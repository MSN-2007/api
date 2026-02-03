# GitHub Repository Analyzer API

A production-ready REST API that analyzes public GitHub repositories and returns structured engineering analysis with deterministic scoring.

## Features

- **Repository Analysis**: `POST /api/v1/analyze-repo` - Analyze GitHub repositories
- **Answer Evaluation**: `POST /api/v1/evaluate-answer` - Evaluate technical answers for understanding
- **Deterministic Scoring**: Rule-based scoring (0-100) based on repository characteristics
- **LLM-Powered Analysis**: AI-generated summary, technical questions, and notes
- **No Auth Required**: Simple API for immediate use
- **Production Ready**: Clean error handling and validation

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your API keys:

```env
GITHUB_TOKEN=your_github_token_here
OPENAI_API_KEY=your_openai_api_key_here
```

**API Keys:**
- `GITHUB_TOKEN`: Optional but recommended to avoid rate limits. [Get one here](https://github.com/settings/tokens)
- `OPENAI_API_KEY`: Required for LLM analysis. [Get one here](https://platform.openai.com/api-keys)

### 3. Run Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## API Usage

### Endpoint

```
POST /api/v1/analyze-repo
```

### Request

```bash
curl -X POST http://localhost:3000/api/v1/analyze-repo \
  -H "Content-Type: application/json" \
  -d '{"repo_url": "https://github.com/vercel/next.js"}'
```

### Request Body

```json
{
  "repo_url": "https://github.com/owner/repo"
}
```

### Response

```json
{
  "repo": {
    "owner": "vercel",
    "name": "next.js"
  },
  "summary": [
    "Next.js is a React framework for production",
    "Supports server-side rendering and static site generation",
    "Built-in routing, API routes, and optimization features"
  ],
  "technical_questions": [
    "How does Next.js handle incremental static regeneration?",
    "What is the architecture of the App Router vs Pages Router?",
    "How are server components implemented internally?"
  ],
  "scorecard": {
    "overall": 95,
    "breakdown": {
      "documentation": 25,
      "structure": 25,
      "completeness": 20,
      "engineering_maturity": 25
    }
  },
  "notes": [
    "Comprehensive test coverage with multiple test frameworks",
    "Active CI/CD with GitHub Actions",
    "Well-documented with extensive examples"
  ]
}
```

## Scoring System

The API uses **deterministic, rule-based scoring** (no LLM involvement in scores):

### Documentation (0-25 points)
- README exists: +10
- README > 500 chars: +5
- README > 2000 chars: +5
- README > 5000 chars: +5

### Structure (0-25 points)
- File count > 5: +5
- File count > 20: +5
- File count > 50: +5
- Has dependency file (package.json, requirements.txt, etc.): +10

### Completeness (0-20 points)
- Has test files: +10
- Has multiple test files (>3): +10

### Engineering Maturity (0-30 points)
- Has CI/CD (.github/workflows, etc.): +15
- Has config examples (.env.example): +5
- Has LICENSE: +5
- Has CONTRIBUTING.md or CHANGELOG.md: +5

**Total Score: 0-100 points**

## Error Handling

The API returns appropriate HTTP status codes:

- `200`: Success
- `400`: Invalid request (missing or invalid repo_url)
- `404`: Repository not found or is private
- `429`: GitHub API rate limit exceeded
- `500`: Internal server error

## Project Structure

```
repo-analyzer/
├── app/
│   ├── api/
│   │   └── v1/
│   │       └── analyze-repo/
│   │           └── route.ts          # Main API route
│   └── page.tsx                      # API documentation page
├── lib/
│   ├── github.ts                     # GitHub API utilities
│   ├── scoring.ts                    # Deterministic scoring logic
│   ├── llm.ts                        # LLM integration
│   └── evaluation.ts                 # Answer evaluation system
├── .env.local.example                # Environment template
└── README.md
```

## Tech Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **GitHub REST API**
- **OpenAI API** (gpt-4o-mini)

## Testing Examples

### Test with a popular repository
```bash
curl -X POST http://localhost:3000/api/v1/analyze-repo \
  -H "Content-Type: application/json" \
  -d '{"repo_url": "https://github.com/facebook/react"}'
```

### Test with a smaller repository
```bash
curl -X POST http://localhost:3000/api/v1/analyze-repo \
  -H "Content-Type: application/json" \
  -d '{"repo_url": "https://github.com/sindresorhus/is"}'
```

### Test error handling (invalid URL)
```bash
curl -X POST http://localhost:3000/api/v1/analyze-repo \
  -H "Content-Type: application/json" \
  -d '{"repo_url": "not-a-valid-url"}'
```

## Answer Evaluation Endpoint

### Endpoint

```
POST /api/v1/evaluate-answer
```

This endpoint evaluates whether a technical answer demonstrates **real understanding** of a project vs shallow/AI-generated knowledge.

### Request

```bash
curl -X POST http://localhost:3000/api/v1/evaluate-answer \
  -H "Content-Type: application/json" \
  -d '{
    "readme": "# Project README content...",
    "question": "How does the scoring system work?",
    "answer": "The scoring is deterministic and rule-based..."
  }'
```

### Request Body

```json
{
  "readme": "string (README content)",
  "question": "string (technical question)",
  "answer": "string (user's answer to evaluate)"
}
```

### Response

```json
{
  "understanding_score": 75,
  "breakdown": {
    "consistency_with_readme": 20,
    "specificity": 18,
    "depth_of_reasoning": 22,
    "honesty_and_limitations": 15
  },
  "flags": ["generic_language"],
  "notes": [
    "Answer stays within README scope",
    "Could provide more specific examples"
  ],
  "confidence_level": "medium"
}
```

### Evaluation Criteria

The system evaluates answers on 4 dimensions (0-25 points each):

1. **README Consistency**: Penalizes hallucinated details not in README
2. **Specificity**: Rewards concrete constraints vs generic buzzwords
3. **Depth of Reasoning**: Requires insight beyond paraphrasing
4. **Honesty & Limitations**: Rewards acknowledging unknowns

**Scoring Philosophy**: Intentionally strict to detect shallow understanding. Scores below 50 indicate the answer could be written without project knowledge.

### Test the Evaluation

```bash
node test-evaluation.mjs
```

## Production Deployment


This API can be deployed to:
- **Vercel** (recommended for Next.js)
- **Railway**
- **Render**
- **Any Node.js hosting platform**

Make sure to set environment variables in your hosting platform's dashboard.

## License

MIT
