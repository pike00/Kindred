export const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:5173";
export const API_URL =
	process.env.E2E_API_URL ?? BASE_URL.replace(":5173", ":8001");
