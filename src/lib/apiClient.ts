/**
 * src/lib/apiClient.ts
 * ─────────────────────────────────────────────────────
 * Centralised Axios instance that talks to the devlog backend.
 *
 * Features:
 *  - Automatically attaches the JWT token from localStorage to every request
 *  - Redirects to /login on 401 (token expired)
 *  - Throws typed errors so services don't have to handle them individually
 *
 * Usage in services:
 *   import api from "@/lib/apiClient";
 *   const data = await api.get("/teams");
 */
import axios from "axios";

// Base URL — in dev this hits localhost:3001, in production set VITE_API_URL
const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001/api";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10_000,
});

// ── Request interceptor: attach JWT ───────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("devlog_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: handle 401 globally ────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear storage and go to login
      localStorage.removeItem("devlog_token");
      localStorage.removeItem("devlog_user");
      window.location.href = "/";
    }
    // Re-throw so individual services can handle specific errors
    return Promise.reject(error);
  }
);

export default api;

// ── Auth token helpers ────────────────────────────────────────────────────────

export function saveToken(token: string) {
  localStorage.setItem("devlog_token", token);
}

export function clearToken() {
  localStorage.removeItem("devlog_token");
  localStorage.removeItem("devlog_user");
  localStorage.removeItem("devlog_team");
}

export function getStoredToken(): string | null {
  return localStorage.getItem("devlog_token");
}

// ── Active team helpers ───────────────────────────────────────────────────────
// The frontend tracks which team the user is currently "in".

export function saveActiveTeam(teamId: string) {
  localStorage.setItem("devlog_team", teamId);
}

export function getActiveTeam(): string | null {
  return localStorage.getItem("devlog_team");
}
