export function getDeadline(): Date | null {
  const raw = process.env.SUBMIT_DEADLINE;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isDeadlinePassed(): boolean {
  const deadline = getDeadline();
  if (!deadline) return false;
  return Date.now() > deadline.getTime();
}
