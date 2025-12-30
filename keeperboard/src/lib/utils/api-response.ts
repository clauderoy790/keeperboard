export function successResponse<T>(
  data: T,
  status = 200,
  headers?: HeadersInit
) {
  return Response.json(
    { success: true, data },
    { status, headers }
  );
}

export function errorResponse(
  error: string,
  code: string,
  status = 400,
  headers?: HeadersInit
) {
  return Response.json(
    { success: false, error, code },
    { status, headers }
  );
}
