/** A to Z ignoring letter case (decision #50); equal names keep their input order (decision #350). */
export function byName<T extends { name: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
}
