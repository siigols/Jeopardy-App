/** Join truthy class names; caller-supplied classes are appended last. */
export function cx(...parts: Array<string | false | null | undefined>): string | undefined {
  const joined = parts.filter(Boolean).join(' ')
  return joined.length > 0 ? joined : undefined
}
