export function omitEmpty<T extends Record<string, unknown>>(
  where: T,
): T | undefined {
  return Object.values(where).some((value) => value !== undefined)
    ? where
    : undefined;
}

export function numberRange(min?: number, max?: number) {
  if (min === undefined && max === undefined) {
    return undefined;
  }

  return {
    ...(min !== undefined && { gte: min }),
    ...(max !== undefined && { lte: max }),
  };
}
