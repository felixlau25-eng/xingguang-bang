const KEY = "star-chart-teacher-token";

export function getTeacherToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY);
}

export function setTeacherToken(token: string) {
  window.localStorage.setItem(KEY, token);
}

export function clearTeacherToken() {
  window.localStorage.removeItem(KEY);
}
