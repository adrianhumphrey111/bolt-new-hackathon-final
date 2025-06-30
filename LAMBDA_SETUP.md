# Remotion Lambda Setup Guide

This guide helps you set up the pre-deployed Lambda infrastructure for scalable video rendering.

## Prerequisites

1. AWS Account with credentials configured
2. Remotion Lambda permissions set up (you mentioned you've already done this)

## One-Time Setup

### 1. Deploy the Lambda Function

```bash
npx remotion lambda functions deploy --memory=2048 --timeout=120
```

This will output something like:
```
Function deployed as: remotion-render-4-0-320-mem2048mb-disk2048mb-120sec
```

### 2. Deploy Your Site

```bash
npx remotion lambda sites create src/remotion/index.ts --site-name=timeline-renderer
```

This will output something like:
```
Site deployed to: https://remotionlambda-abcdef.s3.us-east-1.amazonaws.com/sites/timeline-renderer
```

### 3. Update Your .env.local

Add these values to your `.env.local` file:

```env
# AWS Credentials (you already have these)
REMOTION_AWS_ACCESS_KEY_ID=your-access-key
REMOTION_AWS_SECRET_ACCESS_KEY=your-secret-key

# From step 1 - your function name
REMOTION_FUNCTION_NAME=remotion-render-4-0-320-mem2048mb-disk2048mb-120sec

# From step 2 - your site URL
REMOTION_SERVE_URL=https://remotionlambda-abcdef.s3.us-east-1.amazonaws.com/sites/timeline-renderer

# Region (default is us-east-1)
REMOTION_AWS_REGION=us-east-1

# Optional
WEBHOOK_SECRET=your-webhook-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   User 1    │────▶│              │────▶│ Lambda Instance │
└─────────────┘     │              │     └─────────────────┘
                    │   Your App   │     
┌─────────────┐     │   API Route  │     ┌─────────────────┐
│   User 2    │────▶│              │────▶│ Lambda Instance │
└─────────────┘     │              │     └─────────────────┘
                    └──────────────┘     
┌─────────────┐                          ┌─────────────────┐
│   User N    │─────────────────────────▶│ Lambda Instance │
└─────────────┘                          └─────────────────┘

All users share:
- Same Lambda function (auto-scales)
- Same deployed site
- Different timeline data (passed as inputProps)
```

## Updating Your Site

When you update your Remotion code:

```bash
npx remotion lambda sites create src/remotion/index.ts --site-name=timeline-renderer
```

Use the same `--site-name` to overwrite the existing deployment.

## Cost Optimization Tips

1. **Use appropriate quality settings**: Lower quality = faster/cheaper renders
2. **Set concurrency limits**: Prevent runaway costs
3. **Monitor usage**: Use AWS CloudWatch to track Lambda invocations
4. **Implement user limits**: Limit renders per user/day

## Troubleshooting

1. **Check function exists**: 
   ```bash
   npx remotion lambda functions ls
   ```

2. **Check site exists**:
   ```bash
   npx remotion lambda sites ls
   ```

3. **Validate permissions**:
   ```bash
   npx remotion lambda policies validate
   ```

## Next Steps

1. Test a render using the "Cloud (AWS Lambda)" option in the render modal
2. Monitor your AWS CloudWatch logs
3. Set up billing alerts in AWS
4. Consider implementing a queue system for high traffic