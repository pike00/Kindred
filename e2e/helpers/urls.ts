export const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:5173";

function defaultApiUrl(baseUrl: string) {
	const url = new URL(baseUrl);
	if (url.port === "5173") {
		url.port = "8001";
	}
	return url.origin;
}

export const API_URL = process.env.E2E_API_URL ?? defaultApiUrl(BASE_URL);
