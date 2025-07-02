# API Structure Guidelines

This document outlines the standardized patterns for all backend API routes in the Tailored Labs application.

## Authentication Pattern

All API routes must follow this authentication pattern:

### 1. Import Required Functions
```typescript
import { getUserFromRequest } from '@/lib/supabase/server';
```

### 2. Standard Auth Check
```typescript
export async function POST(request: NextRequest) {
  try {
    // Parse request body first (if needed)
    const body = await request.json();
    
    // Check authentication and get authenticated client
    const { user, supabase } = await getUserFromRequest(request);
    
    if (!user || !supabase) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Continue with business logic...
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
```

### 3. Frontend Requirements
All frontend requests must include the Authorization header:

```typescript
const { session } = useAuthContext();

const response = await fetch('/api/your-endpoint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  },
  body: JSON.stringify(data),
});
```

## Response Format Standards

### Success Responses
```typescript
return NextResponse.json({
  success: true,
  data: result, // Optional data payload
  message: 'Operation successful', // Optional success message
});
```

### Error Responses
```typescript
return NextResponse.json({
  success: false,
  error: 'Descriptive error message',
  details: errorDetails, // Optional additional error info
}, { status: appropriateHttpStatusCode });
```

## Project Access Validation

For routes that access project-specific resources:

```typescript
export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    
    const { user, supabase } = await getUserFromRequest(request);
    if (!user || !supabase) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Verify user has access to this project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ 
        success: false, 
        error: 'Project not found or access denied' 
      }, { status: 404 });
    }

    // Continue with business logic...
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
```

## Credits Integration

For operations that consume user credits:

```typescript
import { withCreditsCheck, useCredits } from '@/lib/credits';

export async function POST(request: NextRequest) {
  return withCreditsCheck(request, 'operation_type', async (userId, supabase) => {
    try {
      const body = await request.json();
      
      // Perform the operation...
      const result = await performOperation(body, supabase);
      
      // Deduct credits after successful operation
      const creditsUsed = await useCredits(userId, 'operation_type', {
        metadata: { /* relevant operation metadata */ }
      }, supabase);

      return NextResponse.json({
        success: true,
        data: result,
        creditsUsed,
      });
    } catch (error) {
      return NextResponse.json({ 
        success: false, 
        error: 'Operation failed' 
      }, { status: 500 });
    }
  });
}
```

## File Organization

```
src/app/api/
├── user/                     # User management endpoints
│   ├── profile/route.ts
│   └── preferences/route.ts
├── projects/                 # Project CRUD operations
│   ├── route.ts
│   └── [projectId]/
│       ├── route.ts
│       └── timeline/route.ts
├── timeline/                 # Timeline-specific operations
│   └── [projectId]/
│       ├── chat/route.ts
│       └── analysis/route.ts
└── render/                   # Video rendering operations
    ├── start/route.ts
    └── progress/[renderId]/route.ts
```

## HTTP Status Codes

Use appropriate HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (authentication failed)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `422` - Unprocessable Entity (validation failed)
- `429` - Too Many Requests (rate limiting)
- `500` - Internal Server Error

## Database Operations

Always use the authenticated `supabase` client returned from `getUserFromRequest`:

```typescript
// ✅ Correct - Uses authenticated client with RLS
const { user, supabase } = await getUserFromRequest(request);
const { data } = await supabase
  .from('projects')
  .select('*')
  .eq('user_id', user.id);

// ❌ Wrong - Bypasses RLS
const supabase = createServerSupabaseClient();
const { data } = await supabase
  .from('projects')
  .select('*');
```

## Error Handling

Implement comprehensive error handling:

```typescript
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const { user, supabase } = await getUserFromRequest(request);
    if (!user || !supabase) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Input validation
    const body = await request.json();
    if (!body.requiredField) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required field: requiredField' 
      }, { status: 400 });
    }

    // Business logic
    const result = await performOperation(body, supabase);
    
    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('API Error:', error);
    
    // Handle specific error types
    if (error instanceof ValidationError) {
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 422 });
    }
    
    if (error instanceof NotFoundError) {
      return NextResponse.json({ 
        success: false, 
        error: 'Resource not found' 
      }, { status: 404 });
    }

    // Generic error response
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
```

## Environment Variables

Document required environment variables at the top of each route file:

```typescript
// Required environment variables:
// - NEXT_PUBLIC_SUPABASE_URL
// - NEXT_PUBLIC_SUPABASE_ANON_KEY
// - REMOTION_LAMBDA_FUNCTION_NAME (for render endpoints)
// - REMOTION_SERVE_URL (for render endpoints)
// - AWS_REGION (for render endpoints)

const LAMBDA_FUNCTION_NAME = process.env.REMOTION_LAMBDA_FUNCTION_NAME!;
```

## Testing Guidelines

1. **Authentication Tests**: Verify unauthorized requests return 401
2. **Input Validation**: Test with invalid/missing data
3. **Success Cases**: Test happy path scenarios
4. **Error Cases**: Test error handling and appropriate status codes
5. **Performance**: Monitor response times for database operations

## Security Considerations

1. **Always validate user ownership** of resources
2. **Use Row Level Security (RLS)** with authenticated Supabase client
3. **Sanitize inputs** to prevent injection attacks
4. **Rate limit** expensive operations
5. **Don't expose sensitive data** in error messages
6. **Log security events** for monitoring
7. **Secure test endpoints** - All test/debug endpoints must require authentication
8. **Remove or restrict** test endpoints in production environments

### Test Endpoint Security

Test endpoints like `/api/test-aws-creds` and `/api/test-bedrock` should be secured:

```typescript
export async function GET(request: NextRequest) {
  // Auth check - only authenticated users can access test endpoints
  const { user } = await getUserFromRequest(request);
  
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized - Authentication required' },
      { status: 401 }
    );
  }
  
  // Additional check: restrict to admin users in production
  if (process.env.NODE_ENV === 'production') {
    // Check if user has admin role or disable entirely
    return NextResponse.json(
      { error: 'Test endpoints disabled in production' },
      { status: 403 }
    );
  }
  
  // Test logic here...
}
```

## Example Implementation

See `/src/app/api/render/start/route.ts` for a complete example following these patterns.

## Migration Checklist

When adding new API routes:

- [ ] Uses `getUserFromRequest` for authentication
- [ ] Includes Authorization header in frontend calls
- [ ] Follows standard response format
- [ ] Implements proper error handling
- [ ] Validates user permissions for resources
- [ ] Documents required environment variables
- [ ] Adds appropriate tests
- [ ] Updates this documentation if introducing new patterns