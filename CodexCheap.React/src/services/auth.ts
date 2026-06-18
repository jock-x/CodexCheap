const TOKEN_KEY = 'codexcheap_token'
const USER_KEY = 'codexcheap_user'

export function setSession(token: string, userName: string) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, userName)
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getUserName() {
  return localStorage.getItem(USER_KEY) ?? 'admin'
}

export function isLoggedIn() {
  return Boolean(getToken())
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}
