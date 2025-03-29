# Claude API Setup Guide

This guide explains how to set up the Claude API integration for the Astroworld application.

## Overview

The application has been updated to use the Anthropic Claude API as the AI backend for astrological insights. This document guides you through the setup process for the Claude API integration.

## Prerequisites

1. An [Anthropic Claude API key](https://console.anthropic.com/)
2. Access to your Vercel project settings

## Setting Up Your Claude API Key

### Local Development

1. Open your `.env` file or create one if it doesn't exist
2. Add your Claude API key:
   ```
   VITE_CLAUDE_API_KEY=sk-ant-api03-xxxxxxxxxxxx
   ```
   Replace `sk-ant-api03-xxxxxxxxxxxx` with your actual Claude API key.

### Vercel Deployment

1. Log in to your [Vercel dashboard](https://vercel.com/)
2. Select your Astroworld project
3. Go to "Settings" > "Environment Variables"
4. Add the following environment variables:
   - `CLAUDE_API_KEY`: Your Claude API key
   - `VITE_CLAUDE_API_KEY`: The same Claude API key

   Both variables should be set to ensure proper functioning in both server-side and client-side code.

5. Save your changes and redeploy your application

## Verifying the Setup

After setting up your Claude API key, you can verify it's working correctly by:

1. Visiting your deployed application
2. Making a request that uses the AI functionality (e.g., generating an astrological insight)
3. Check the application logs in Vercel to ensure there are no API key errors

You can also use the included test script to verify the Claude API integration:

```bash
node vercel-deploy-test.js
```

## Troubleshooting

### "API key is not configured" Error

If you see this error, it means the Claude API key is not properly set in your environment variables. Check that:

1. The environment variable is named correctly (`CLAUDE_API_KEY` and `VITE_CLAUDE_API_KEY`)
2. The API key is valid and formatted correctly (starts with `sk-ant-`)
3. The environment variables are set in the correct environment (Development, Preview, Production)

### "Invalid x-api-key" Error

This indicates that the Claude API key is present but invalid. Check that:

1. The API key is copied correctly from the Anthropic console
2. The API key is active and not expired
3. The API key has the correct permissions

## Fallback Mechanism

The implementation includes a fallback to the original Together AI API if the Claude API fails. This ensures that the application remains functional even if there are issues with the Claude API. The fallback is automatic and requires no additional configuration if the Together AI API key is already set up.

## Support

If you encounter any issues with the Claude API integration, please contact the development team for assistance. 