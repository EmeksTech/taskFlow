const externalApiCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Cache-Control": "no-store",
};

export function withExternalApiCors(response: Response) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(externalApiCorsHeaders)) {
    headers.set(name, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function externalApiOptions() {
  return withExternalApiCors(new Response(null, { status: 204 }));
}
