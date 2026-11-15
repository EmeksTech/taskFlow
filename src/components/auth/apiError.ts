export async function getApiError(response: Response) {
  const payload: unknown = await response.json().catch(() => null);
  if (typeof payload !== "object" || payload === null || !("error" in payload)) {
    return "Please try again.";
  }

  const error = payload.error;
  if (typeof error !== "object" || error === null) {
    return "Please try again.";
  }

  if ("details" in error && Array.isArray(error.details)) {
    const messages = error.details.flatMap((detail: unknown) =>
      typeof detail === "object" &&
      detail !== null &&
      "message" in detail &&
      typeof detail.message === "string"
        ? [detail.message]
        : [],
    );
    if (messages.length > 0) return messages.join(" ");
  }

  return "message" in error && typeof error.message === "string"
    ? error.message
    : "Please try again.";
}
