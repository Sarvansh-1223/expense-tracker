export function extractError(err) {
  const data = err?.response?.data;
  if (!data) return "Something went wrong. Please try again.";
  if (data.errors) {
    const first = Object.values(data.errors)[0];
    if (Array.isArray(first)) return first[0];
    if (typeof first === "string") return first;
  }
  if (data.detail) return data.detail;
  return "Something went wrong. Please try again.";
}
