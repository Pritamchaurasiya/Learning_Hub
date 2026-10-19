// Token management is handled via httpOnly cookies set by the backend.
// This file is intentionally empty — auth tokens are no longer stored in localStorage.
// The backend sets httpOnly cookies via Set-Cookie headers on login/register/refresh.
// Frontend reads tokens from cookies automatically via credentials: 'include'.
export {}
