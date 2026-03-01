let logoutHandler: (() => void) | null = null;

const AUTH_TOKEN_KEY = 'auth_token';
const BASIC_CREDENTIAL_KEY = 'basic_credential';

const readToken = () => localStorage.getItem(AUTH_TOKEN_KEY);
const readBasicCredential = () => localStorage.getItem(BASIC_CREDENTIAL_KEY);

export const setAuthToken = (token: string) => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.removeItem(BASIC_CREDENTIAL_KEY);
};

export const setBasicCredential = (credential: string) => {
  localStorage.setItem(BASIC_CREDENTIAL_KEY, credential);
  localStorage.removeItem(AUTH_TOKEN_KEY);
};

export const clearAuthCredential = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(BASIC_CREDENTIAL_KEY);
};

export const registerAuthFailureHandler = (handler: () => void) => {
  logoutHandler = handler;
};

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const parseJson = async (response: Response) => {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export const isNetworkError = (error: unknown) =>
  error instanceof TypeError ||
  (error instanceof Error && /failed|network|fetch/i.test(error.message));

const buildAuthHeader = () => {
  const token = readToken();
  if (token) {
    return `Bearer ${token}`;
  }

  const basic = readBasicCredential();
  if (basic) {
    return `Basic ${basic}`;
  }

  return null;
};

export const apiFetch = async <T>(input: string, init?: RequestInit): Promise<T> => {
  const authHeader = buildAuthHeader();

  const response = await fetch(input, {
    ...init,
    credentials: 'include', 
    headers: {
      ...(init?.headers ?? {}), 
      'Content-Type': 'application/json',
      ...(authHeader ? { Authorization: authHeader } : {})
    },
    signal: init?.signal
  });

  if (response.status === 401) {
    clearAuthCredential();
    logoutHandler?.();
    throw new ApiError('Unauthorized', 401);
  }

  if (!response.ok) {
    const details = await parseJson(response);
    const message =
      typeof details === 'object' && details && 'message' in details
        ? String((details as { message: unknown }).message)
        : `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, details);
  }

  return (await parseJson(response)) as T;
};
