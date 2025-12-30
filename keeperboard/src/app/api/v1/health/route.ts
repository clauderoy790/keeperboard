import { successResponse } from '@/lib/utils/api-response';
import { corsHeaders } from '@/lib/utils/cors';

export async function GET() {
  return successResponse(
    {
      service: 'keeperboard',
      version: '0.1.0-skeleton',
      timestamp: new Date().toISOString(),
    },
    200,
    corsHeaders
  );
}

// Handle preflight requests
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
