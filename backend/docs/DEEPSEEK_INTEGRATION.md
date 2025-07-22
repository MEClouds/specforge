# DeepSeek API Integration

This document explains how to integrate and use DeepSeek API with the SpecForge AI Specification Generator.

## Overview

DeepSeek is now supported as a third AI provider alongside OpenAI and Anthropic. The integration allows you to use DeepSeek's chat completion API for generating AI responses from different personas.

## Configuration

### Environment Variables

Add the following environment variable to your `.env` file:

```bash
# DeepSeek API Key
DEEPSEEK_API_KEY=your_deepseek_api_key_here

# Set DeepSeek as default provider (optional)
AI_DEFAULT_PROVIDER=deepseek
```

### Getting a DeepSeek API Key

1. Visit [DeepSeek Platform](https://platform.deepseek.com/)
2. Sign up for an account
3. Navigate to API Keys section
4. Generate a new API key
5. Copy the key and add it to your environment variables

## Usage

### Setting DeepSeek as Default Provider

To use DeepSeek as your primary AI provider, set the environment variable:

```bash
AI_DEFAULT_PROVIDER=deepseek
```

### API Configuration

The DeepSeek integration uses the following configuration:

- **Model**: `deepseek-chat`
- **Endpoint**: `https://api.deepseek.com/v1/chat/completions`
- **Max Tokens**: Configurable via `AI_MAX_TOKENS` (default: 2000)
- **Temperature**: Configurable via `AI_TEMPERATURE` (default: 0.7)
- **Rate Limiting**: Configurable via `AI_RATE_LIMIT_PER_MINUTE` (default: 10)

### Fallback Behavior

If DeepSeek is set as the default provider but fails, the system will automatically fallback to:

1. OpenAI (if configured)
2. Anthropic (if configured)

## API Endpoints

All existing AI endpoints now support DeepSeek:

- `GET /api/ai/personas` - Get available personas
- `POST /api/ai/generate-response` - Generate response from specific persona
- `POST /api/ai/orchestrate-conversation` - Multi-persona conversation
- `GET /api/ai/validate-keys` - Validate API keys (now includes DeepSeek)

## Error Handling

The DeepSeek integration includes comprehensive error handling:

- API key validation
- Rate limiting
- Network error handling
- Graceful fallback to other providers

## Testing

The integration includes full test coverage:

```bash
# Run AI service tests
npm test -- --testPathPatterns="AIService"

# Run all tests
npm test
```

## Example Response

When using DeepSeek, the API response includes:

```json
{
  "success": true,
  "data": {
    "content": "AI-generated response from DeepSeek",
    "persona": "product-manager",
    "tokens": 150,
    "processingTimeMs": 1200
  }
}
```

## Troubleshooting

### Common Issues

1. **Invalid API Key**: Ensure your DeepSeek API key is valid and has sufficient credits
2. **Rate Limiting**: Check your rate limits and adjust `AI_RATE_LIMIT_PER_MINUTE` if needed
3. **Network Issues**: DeepSeek API requires internet connectivity

### Validation

Use the validation endpoint to check if your DeepSeek API key is working:

```bash
curl -X GET http://localhost:3001/api/ai/validate-keys
```

Expected response:

```json
{
  "success": true,
  "data": {
    "openai": true,
    "anthropic": false,
    "deepseek": true
  }
}
```

## Cost Considerations

- DeepSeek typically offers competitive pricing compared to other providers
- Monitor your usage through the DeepSeek platform dashboard
- Consider setting appropriate rate limits to control costs

## Security

- Store API keys securely in environment variables
- Never commit API keys to version control
- Use different API keys for development and production environments
- Regularly rotate your API keys for security
