const EDIT_CODE_KEY = 'jeopardy:editCode'

export function loadEditCode(): string | null {
  try {
    return sessionStorage.getItem(EDIT_CODE_KEY)
  } catch {
    return null
  }
}

export function saveEditCode(code: string): void {
  try {
    sessionStorage.setItem(EDIT_CODE_KEY, code)
  } catch {
    // Storage full or unavailable
  }
}

export function clearEditCode(): void {
  try {
    sessionStorage.removeItem(EDIT_CODE_KEY)
  } catch {
    // Storage unavailable
  }
}
