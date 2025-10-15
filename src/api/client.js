const API_BASE_URL = "http://localhost:8000";

const ACCESS_KEY = "access";
const REFRESH_KEY = "refresh";

function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY) || "";
}

function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY) || "";
}

function setTokens(access, refresh) {
  if (access) localStorage.setItem(ACCESS_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const access = getAccessToken();
  if (access) headers.set("Authorization", `Bearer ${access}`);

  const doFetch = () =>
    fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  let res = await doFetch();
  if (res.status === 401) {
    // try refresh
    const refresh = getRefreshToken();
    if (!refresh) return res;
    const refreshRes = await fetch(`${API_BASE_URL}/users/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (refreshRes.ok) {
      const data = await refreshRes.json();
      setTokens(data.access, data.refresh);
      headers.set("Authorization", `Bearer ${data.access}`);
      res = await doFetch();
    }
  }
  return res;
}

export const apiClient = {
  request,
  setTokens,
  getAccessToken,
  getRefreshToken,
  API_BASE_URL,
};

export const authApi = {
  sendCode(email) {
    return request(`/users/send-code`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },
  verifyCode(email, code) {
    return request(`/users/verify-code`, {
      method: "POST",
      body: JSON.stringify({ email, code }),
    });
  },
};

export const eventsApi = {
  getCurrentEvents() {
    return request(`/users/current-events`);
  },
  getAllEvents() {
    return request(`/users/all-events`);
  },
  getEvent(id) {
    return request(`/users/event/${id}`);
  },
  getBlock(id) {
    return request(`/users/block/${id}`);
  },
};


