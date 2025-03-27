# Astroworld Vercel Deployment Guide

This guide provides step-by-step instructions for deploying the Astroworld application to Vercel.

## Prerequisites

Before deploying, ensure you have:

1. A [Vercel account](https://vercel.com/signup)
2. A [GitHub account](https://github.com/signup) (for repository hosting)
3. API credentials for:
   - [Prokerala](https://api.prokerala.com/)
   - [Together AI](https://together.ai)

## Step 1: Prepare Your Repository

1. Push your code to a GitHub repository
2. Ensure the repository includes all the following files:
   - `vercel.json` (Vercel configuration)
   - `.env.production` (Production environment variables template)
   - `api/` directory with serverless functions

## Step 2: Connect to Vercel

1. Log in to your [Vercel dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Select your GitHub repository
4. Configure project settings:
   - **Framework Preset**: Other
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

## Step 3: Configure Environment Variables

In the Vercel project settings, add the following environment variables:

1. `VITE_API_BASE_URL`: Your deployed app URL (e.g., `https://astroworld-nine.vercel.app/`)
2. `VITE_PROKERALA_CLIENT_ID`: Your Prokerala API client ID
3. `VITE_PROKERALA_CLIENT_SECRET`: Your Prokerala API client secret
4. `VITE_TOGETHER_API_KEY`: Your Together AI API key

## Step 4: Deploy

1. Click "Deploy" to start the deployment process
2. Wait for the build and deployment to complete
3. Once deployed, you'll receive a URL for your application

## Step 5: Verify Deployment

After deployment, verify that:

1. The front-end loads correctly
2. API endpoints are accessible
3. Authentication is working
4. Data is being fetched and displayed

You can use the test scripts provided in the `scripts/` directory to verify the API functionality:

```bash
# For Unix/Linux/Mac
./scripts/test-api.sh

# For Windows
scripts\test-api.bat
```

## Troubleshooting

### Common Issues

#### Build Failures

**Problem**: The build fails during deployment.

**Solution**:
1. Check the build logs in the Vercel dashboard
2. Ensure all dependencies are correctly listed in `package.json`
3. Verify that the build script in `package.json` is correct
4. Check for any environment variables that might be missing

#### API Errors

**Problem**: API endpoints return errors after deployment.

**Solution**:
1. Verify that all environment variables are correctly set in Vercel
2. Check that the serverless functions in the `api/` directory are correctly implemented
3. Verify that the `vercel.json` configuration is routing API requests correctly
4. Check CORS settings if frontend and API are on different domains

#### CORS Issues

**Problem**: Browser console shows CORS errors.

**Solution**:
1. Ensure `vercel.json` includes proper CORS headers
2. Check that the API endpoints are setting CORS headers correctly
3. Verify that the API is being called from the expected origin

## Custom Domains

To use a custom domain with your Vercel deployment:

1. In the Vercel dashboard, go to your project
2. Navigate to "Settings" → "Domains"
3. Add your custom domain
4. Follow Vercel's instructions to configure DNS settings

## Continuous Deployment

Vercel automatically sets up continuous deployment from your GitHub repository. When you push changes to the main branch, Vercel will automatically rebuild and redeploy your application.

To disable this behavior:
1. Go to project settings
2. Navigate to "Git" → "Ignored Build Step"
3. Configure the conditions under which builds should be skipped

## Monitoring and Logs

Vercel provides built-in monitoring and logging:

1. In the Vercel dashboard, go to your project
2. Click on "Deployments" to see all deployments
3. Click on a specific deployment to view logs
4. Use the "Functions" tab to monitor serverless function performance

## Need Help?

If you encounter issues not covered in this guide:

1. Check the [Vercel documentation](https://vercel.com/docs)
2. Search for solutions on [Stack Overflow](https://stackoverflow.com/)
3. Refer to the API documentation for [Prokerala](https://api.prokerala.com/docs) and [Together AI](https://docs.together.ai/) 