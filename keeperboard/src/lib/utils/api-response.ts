export function successResponse<T>(data: T, status = 200) {
  return Response.json({ success: true, data }, { status });
}

export function errorResponse(error: string, code: string, status = 400) {
  return Response.json({ success: false, error, code }, { status });
}
