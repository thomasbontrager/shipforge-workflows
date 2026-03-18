const baseUrl = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000";
const strictHealthOk = process.env.SMOKE_STRICT_HEALTH_OK === "true";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function expectJson(method, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-request-id": `smoke-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  return { response, data };
}

async function run() {
  console.log(`Running smoke tests against ${baseUrl}`);

  {
    const response = await fetch(`${baseUrl}/health`, {
      headers: {
        "x-request-id": `smoke-health-${Date.now()}`,
      },
    });
    const data = await response.json();

    if (strictHealthOk) {
      assert(response.status === 200, `/health expected 200, got ${response.status}`);
    } else {
      assert(
        response.status === 200 || response.status === 503,
        `/health expected 200 or 503, got ${response.status}`
      );
    }
    assert(
      typeof data?.status === "string",
      "/health response missing status field"
    );
    assert(
      Boolean(response.headers.get("x-request-id")),
      "/health response missing x-request-id header"
    );
    console.log(`PASS /health -> ${response.status}`);
  }

  {
    const response = await fetch(`${baseUrl}/login`);
    const html = await response.text();

    assert(response.status === 200, `/login expected 200, got ${response.status}`);
    assert(
      html.includes("Sign in to Shipforge"),
      "/login response did not include expected heading"
    );
    console.log("PASS /login");
  }

  {
    const { response, data } = await expectJson("POST", "/api/signup", {});
    assert(
      response.status === 400,
      `/api/signup expected 400 for invalid body, got ${response.status}`
    );
    assert(Boolean(data?.error), "/api/signup invalid body should return error");
    assert(
      Boolean(response.headers.get("x-request-id")),
      "/api/signup response missing x-request-id header"
    );
    assert(
      Boolean(response.headers.get("x-response-time-ms")),
      "/api/signup response missing x-response-time-ms header"
    );
    console.log("PASS /api/signup invalid request");
  }

  {
    const { response, data } = await expectJson("POST", "/api/contact", {});
    assert(
      response.status === 400,
      `/api/contact expected 400 for invalid body, got ${response.status}`
    );
    assert(Boolean(data?.error), "/api/contact invalid body should return error");
    assert(
      Boolean(response.headers.get("x-request-id")),
      "/api/contact response missing x-request-id header"
    );
    assert(
      Boolean(response.headers.get("x-response-time-ms")),
      "/api/contact response missing x-response-time-ms header"
    );
    console.log("PASS /api/contact invalid request");
  }

  {
    const { response, data } = await expectJson("GET", "/api/auth/providers");
    assert(
      response.status === 200,
      `/api/auth/providers expected 200, got ${response.status}`
    );
    assert(
      Boolean(data?.credentials),
      "/api/auth/providers should include credentials provider"
    );
    console.log("PASS /api/auth/providers");
  }

  {
    const { response, data } = await expectJson("GET", "/api/auth/session");
    assert(
      response.status === 200,
      `/api/auth/session expected 200, got ${response.status}`
    );
    assert(
      data !== null && typeof data === "object",
      "/api/auth/session expected object response"
    );
    console.log("PASS /api/auth/session");
  }

  console.log("All smoke tests passed.");
}

try {
  await run();
} catch (error) {
  console.error("Smoke test failure:", error instanceof Error ? error.message : error);
  process.exit(1);
}
