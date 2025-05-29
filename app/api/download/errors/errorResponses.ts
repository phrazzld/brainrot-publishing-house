import { NextResponse } from 'next/server';

import { categorizeError, getDeveloperHint } from './errorCategories';
import { ProxyErrorConfig } from './errorTypes';
import { createErrorHeaders } from '../responses/responseHeaders';

/**
 * Creates common response object properties for error responses
 * 
 * @param errorType Error type description
 * @param errorMessage User-facing error message
 * @param errorCategory Error category for grouping
 * @param operationId Optional operation ID for tracking
 * @returns Base response object with common properties
 */
function createBaseErrorResponseObject(
  errorType: string,
  errorMessage: string,
  errorCategory: string,
  operationId?: string
): Record<string, unknown> {
  const responseObj: Record<string, unknown> = {
    error: errorType,
    message: errorMessage,
    code: `${errorCategory}.${errorCategory}`,
    timestamp: new Date().toISOString(),
  };

  // Add operation ID if available for tracking
  if (operationId) {
    responseObj.operationId = operationId;
  }

  return responseObj;
}

/**
 * Adds environment-specific details to error response
 * 
 * @param responseObj Base response object
 * @param status HTTP status code
 * @param details Optional technical details
 * @param operationId Optional operation ID
 * @returns Response object with environment-specific additions
 */
function addEnvironmentDetails(
  responseObj: Record<string, unknown>,
  status: number,
  details?: string,
  operationId?: string
): Record<string, unknown> {
  if (process.env.NODE_ENV !== 'production') {
    // Add detailed technical information in non-production environments
    
    // If details is a JSON string, parse it for better formatting
    let parsedDetails: unknown = details;
    if (details && details.startsWith('{') && details.endsWith('}')) {
      try {
        parsedDetails = JSON.parse(details);
      } catch {
        // If parsing fails, keep original string
        parsedDetails = details;
      }
    }

    // Add detailed error information for development/testing environments
    responseObj.details = parsedDetails;
    responseObj.env = process.env.NODE_ENV;
    responseObj.deployment = process.env.VERCEL_URL || 'local';

    // Add a developer hint for certain error types
    const hint = getDeveloperHint(status);
    if (hint) {
      responseObj.developerHint = hint;
    }
  } else {
    // For production, include a support reference code (operationId or generated)
    responseObj.ref = operationId || `err-${Date.now().toString(36)}`;
  }

  return responseObj;
}

/**
 * Creates an error response for proxy download failures with environment-aware error details
 *
 * @param config Configuration object containing all parameters
 * @returns NextResponse with appropriate error information based on environment
 */
export function createProxyErrorResponse(config: ProxyErrorConfig): NextResponse {
  const { status, errorMessage, details, operationId } = config;
  
  // Get error type and category based on status code
  const { errorType, errorCategory } = categorizeError(status);

  // Create base response object
  let responseObj = createBaseErrorResponseObject(
    errorType,
    errorMessage,
    errorCategory,
    operationId
  );

  // Add environment-specific details
  responseObj = addEnvironmentDetails(responseObj, status, details, operationId);

  // Create and return the response with appropriate headers
  return NextResponse.json(
    responseObj,
    {
      status,
      headers: createErrorHeaders(errorType, errorCategory, operationId),
    }
  );
}