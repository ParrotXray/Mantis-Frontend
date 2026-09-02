let _token: string | null = null;

export const setAuthToken = (token: string | null): void => {
  _token = token;
};

export const getAuthHeaders = (): Record<string, string> => {
  if (!_token) return {};
  return { Authorization: `Bearer ${_token}` };
};
