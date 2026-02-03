# Quick Start Guide

## Your API is Ready! 🚀

The GitHub Repository Analyzer API is running at: **http://localhost:3000**

## Test It Now

### Using PowerShell (Windows):
```powershell
$body = @{repo_url="https://github.com/sindresorhus/is"} | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:3000/api/v1/analyze-repo" -Method POST -Body $body -ContentType "application/json" | Select-Object -ExpandProperty Content
```

### Using curl:
```bash
curl -X POST http://localhost:3000/api/v1/analyze-repo \
  -H "Content-Type: application/json" \
  -d '{"repo_url": "https://github.com/sindresorhus/is"}'
```

### Using Postman/Insomnia:
1. Method: **POST**
2. URL: `http://localhost:3000/api/v1/analyze-repo`
3. Headers: `Content-Type: application/json`
4. Body (raw JSON):
```json
{
  "repo_url": "https://github.com/owner/repo"
}
```

## Example Response

```json
{
  "repo": {
    "owner": "sindresorhus",
    "name": "is"
  },
  "summary": [
    "TypeScript type checking library",
    "Provides runtime type validation functions"
  ],
  "technical_questions": [
    "What is the primary purpose of this repository?",
    "What are the main technologies used?",
    "How is the project structured?"
  ],
  "scorecard": {
    "overall": 60,
    "breakdown": {
      "documentation": 25,
      "structure": 15,
      "completeness": 0,
      "engineering_maturity": 20
    }
  },
  "notes": [
    "Well-documented project with comprehensive README"
  ]
}
```

## Enable Full LLM Analysis

To get AI-generated summaries and insights:

1. Get an OpenAI API key: https://platform.openai.com/api-keys
2. Edit `.env.local` and add:
   ```
   OPENAI_API_KEY=sk-your-key-here
   ```
3. Restart the server: `npm run dev`

## Scoring System

The API uses deterministic, rule-based scoring (0-100):

- **Documentation (0-25)**: README presence and length
- **Structure (0-25)**: File count and dependency files  
- **Completeness (0-20)**: Test file presence
- **Engineering Maturity (0-30)**: CI/CD, LICENSE, config examples

**Overall score = sum of all breakdown scores**

## Need Help?

- Full documentation: See `README.md`
- Example response: See `example-response.json`
- API endpoint: `POST /api/v1/analyze-repo`

## Try These Repositories

```powershell
# Small library
$body = @{repo_url="https://github.com/sindresorhus/is"} | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:3000/api/v1/analyze-repo" -Method POST -Body $body -ContentType "application/json"

# Your own repository
$body = @{repo_url="https://github.com/YOUR-USERNAME/YOUR-REPO"} | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:3000/api/v1/analyze-repo" -Method POST -Body $body -ContentType "application/json"
```

---

**The API is production-ready and can be deployed to Vercel, Railway, Render, or any Node.js hosting platform!**
