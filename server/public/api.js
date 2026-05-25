(function () {
  async function apiFetch(path, options) {
    const requestOptions = options || {};
    const headers = new Headers(requestOptions.headers || {});
    let body = requestOptions.body;

    if (body && typeof body === "object" && !(body instanceof FormData) && !(body instanceof URLSearchParams)) {
      headers.set("Content-Type", "application/json");
      body = JSON.stringify(body);
    }

    headers.set("Accept", "application/json");

    const response = await fetch(path, {
      ...requestOptions,
      body,
      headers,
      credentials: "same-origin"
    });

    if (response.status === 204) {
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const message = payload && typeof payload === "object" && payload.error
        ? payload.error
        : `Request failed with status ${response.status}`;
      const error = new Error(message);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return payload;
  }

  Object.assign(window, {
    apiFetch
  });
})();
