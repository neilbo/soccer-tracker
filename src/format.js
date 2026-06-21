// Shared formatting helpers.

export const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
    : "N/A";
