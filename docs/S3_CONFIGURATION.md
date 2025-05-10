# S3/Spaces Configuration Guide

This document describes the configuration required for the application to properly interact with S3-compatible storage services, particularly Digital Ocean Spaces.

## Environment Variables

The following environment variables are used for S3/Spaces configuration:

### Credentials (Required in Production)

| Environment Variable       | Legacy Variable                       | Description                                        |
| -------------------------- | ------------------------------------- | -------------------------------------------------- |
| `SPACES_ACCESS_KEY_ID`     | `DO_SPACES_ACCESS_KEY`                | Access key for authenticating with S3/Spaces       |
| `SPACES_SECRET_ACCESS_KEY` | `DO_SPACES_SECRET_KEY`                | Secret key for authenticating with S3/Spaces       |
| `SPACES_ENDPOINT`          | `DO_SPACES_ENDPOINT`                  | Endpoint URL (e.g., `nyc3.digitaloceanspaces.com`) |
| `SPACES_BUCKET_NAME`       | `SPACES_BUCKET` or `DO_SPACES_BUCKET` | Name of the bucket/space to use                    |

### Optional Configuration

| Environment Variable          | Description                            | Default            |
| ----------------------------- | -------------------------------------- | ------------------ |
| `SPACES_REGION`               | Region where the space is located      | `us-east-1`        |
| `SPACES_EXPIRY_SECONDS`       | Expiry time for signed URLs in seconds | `900` (15 minutes) |
| `NEXT_PUBLIC_SPACES_BASE_URL` | Public base URL for Spaces assets      | -                  |

## Environment-Based Configuration

The application handles S3 configuration differently based on the environment:

### Production Environment

In production, all S3 credential environment variables are **strictly required**. The application will return an error if any of these variables are missing.

### Preview and Development Environments

In preview and development environments, S3 credentials are **optional**. If credentials are missing, the application will:

1. Log a warning about the missing configuration
2. Attempt to use fallback mechanisms (like Vercel Blob storage)
3. Continue execution without failing

## Vercel Project Setup

To set up these environment variables in your Vercel project:

1. Go to your project settings in the Vercel dashboard
2. Navigate to the "Environment Variables" section
3. Add each variable and its value
4. Select the environments where each variable should be available (Development, Preview, Production)

For production environments, make sure to add all required variables.

## Checking Current Environment

The application uses the following logic to determine the current environment:

1. First checks `VERCEL_ENV` (set automatically on Vercel deployments)
2. Falls back to `NODE_ENV` if not running on Vercel
3. Defaults to "development" for safety

## Troubleshooting

If you encounter errors related to S3 configuration:

- For "Server is not configured correctly" errors in production, check that all required environment variables are set
- For signed URL generation failures, verify your credentials have the correct permissions
- For access issues, check bucket policies and CORS configuration

## CORS Configuration

If accessing S3/Spaces assets directly from the client-side, ensure your bucket has the appropriate CORS configuration:

```json
[
  {
    "AllowedOrigins": ["https://your-domain.com", "https://www.your-domain.com"],
    "AllowedMethods": ["GET"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": []
  }
]
```

For Spaces, you can set this in the Digital Ocean dashboard under the "Settings" tab of your Space.
