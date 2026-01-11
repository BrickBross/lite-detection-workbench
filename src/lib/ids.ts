export function nextId(prefix: 'OBJ' | 'SIG' | 'RULE', existing: string[]): string {
  const re = new RegExp(`^${prefix}-(\\d{4})$`)
  const nums = existing
    .map((id) => re.exec(id)?.[1])
    .filter(Boolean)
    .map((n) => Number(n))
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return `${prefix}-${String(next).padStart(4, '0')}`
}

export function isoNow(): string {
  return new Date().toISOString()
}
