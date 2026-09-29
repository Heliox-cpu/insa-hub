#!/usr/bin/env bash
set -e

PORT=3888
BASE_URL="http://127.0.0.1:${PORT}"

echo "=========================================================="
echo "ADVERSARIAL STRESS TEST HARNESS — MILESTONE 1 (M1_FOUNDATION)"
echo "Target: ${BASE_URL}"
echo "=========================================================="

# 1. Start server in background
PORT=${PORT} NODE_ENV=development DEBUG=true npx tsx src/server/index.ts > /tmp/insa_server_test.log 2>&1 &
SERVER_PID=$!

cleanup() {
  echo "Terminating test server PID ${SERVER_PID}..."
  kill -TERM ${SERVER_PID} 2>/dev/null || true
  wait ${SERVER_PID} 2>/dev/null || true
}
trap cleanup EXIT

# Wait for server to be responsive
echo "Waiting for server to start on port ${PORT}..."
for i in {1..30}; do
  if curl -s "${BASE_URL}/api/health" > /dev/null 2>&1; then
    echo "Server is ready."
    break
  fi
  sleep 0.2
done

# ---------------------------------------------------------
# Test 1: Service Health & Skeleton Endpoints
# ---------------------------------------------------------
echo ""
echo "--- TEST 1: Service Health & Skeleton Endpoints ---"

echo "1.1: GET /api/health"
HEALTH_RES=$(curl -s -i "${BASE_URL}/api/health")
echo "${HEALTH_RES}"
echo "${HEALTH_RES}" | grep -q "HTTP/1.1 200" || (echo "FAIL: /api/health not 200" && exit 1)
echo "${HEALTH_RES}" | grep -q "application/json" || (echo "FAIL: /api/health not JSON" && exit 1)
echo "${HEALTH_RES}" | grep -q '"service":"insa-campus-api"' || (echo "FAIL: unexpected service" && exit 1)
echo "PASS: /api/health is operational."

for ep in "ade" "menus" "dining" "va" "mdw"; do
  echo "1.2: GET /api/${ep}"
  RES=$(curl -s -i "${BASE_URL}/api/${ep}")
  echo "${RES}" | grep -q "HTTP/1.1 200" || (echo "FAIL: /api/${ep} not 200" && exit 1)
  echo "${RES}" | grep -q "application/json" || (echo "FAIL: /api/${ep} not JSON" && exit 1)
  echo "PASS: /api/${ep} returned 200 JSON."
done

# ---------------------------------------------------------
# Test 2: Route Isolation & 404 Guard (JSON vs HTML SPA fallthrough)
# ---------------------------------------------------------
echo ""
echo "--- TEST 2: Route Isolation & 404 Guard ---"

INVALID_ROUTES=(
  "/api/nonexistent"
  "/api/nonexistent/sub/path"
  "/api/ade/bad_route"
  "/api/menus/unknown"
  "/api/va/fake-event"
  "/api/mdw/admin"
  "/api"
  "/api/"
)

for route in "${INVALID_ROUTES[@]}"; do
  echo "Testing invalid route: GET ${route}"
  RES=$(curl -s -i "${BASE_URL}${route}")
  echo "${RES}" | grep -q "HTTP/1.1 404" || (echo "FAIL: ${route} did not return 404" && exit 1)
  echo "${RES}" | grep -q "application/json" || (echo "FAIL: ${route} did not return JSON" && exit 1)
  if echo "${RES}" | grep -qi "<!DOCTYPE html>"; then
    echo "FAIL: ${route} leaked HTML SPA fallthrough!"
    exit 1
  fi
  echo "PASS: ${route} safely returned structured JSON 404."
done

echo "Testing non-API route fallback: GET /dashboard"
SPA_RES=$(curl -s -i "${BASE_URL}/dashboard")
echo "${SPA_RES}" | grep -q "HTTP/1.1 200" || (echo "FAIL: /dashboard did not return 200 SPA fallback" && exit 1)
echo "${SPA_RES}" | grep -q "text/html" || (echo "FAIL: /dashboard did not return HTML" && exit 1)
echo "PASS: Non-API route correctly serves SPA fallback."

# ---------------------------------------------------------
# Test 3: CORS Headers
# ---------------------------------------------------------
echo ""
echo "--- TEST 3: CORS Headers ---"

echo "3.1: GET /api/health with Origin: http://localhost:5173"
CORS_RES=$(curl -s -i -H "Origin: http://localhost:5173" "${BASE_URL}/api/health")
echo "${CORS_RES}" | grep -qi "access-control-allow-origin: http://localhost:5173" || (echo "FAIL: CORS header missing" && exit 1)
echo "${CORS_RES}" | grep -qi "access-control-allow-credentials: true" || (echo "FAIL: CORS credentials missing" && exit 1)
echo "PASS: CORS headers verified for localhost:5173."

echo "3.2: OPTIONS preflight /api/health with Origin: http://localhost:5173"
OPTIONS_RES=$(curl -s -i -X OPTIONS \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  "${BASE_URL}/api/health")
echo "${OPTIONS_RES}" | grep -qi "access-control-allow-origin: http://localhost:5173" || (echo "FAIL: Preflight CORS origin missing" && exit 1)
echo "${OPTIONS_RES}" | grep -qi "access-control-allow-methods" || (echo "FAIL: Preflight CORS methods missing" && exit 1)
echo "PASS: Preflight OPTIONS handled properly."

echo "3.3: GET /api/health WITHOUT Origin header"
NO_CORS_RES=$(curl -s -i "${BASE_URL}/api/health")
if echo "${NO_CORS_RES}" | grep -qi "access-control-allow-origin"; then
  echo "FAIL: Access-Control-Allow-Origin header was unexpectedly present without Origin header"
  exit 1
fi
echo "PASS: No CORS header emitted when Origin not supplied."

# ---------------------------------------------------------
# Test 4: Adversarial Sensitive Data Leakage Checks
# ---------------------------------------------------------
echo ""
echo "--- TEST 4: Sensitive Data Leakage Checks ---"

echo "4.1: Checking if 404 response leaks sensitive query parameters..."
LEAK_404_RES=$(curl -s "${BASE_URL}/api/nonexistent?password=SUPER_SECRET_PASSWORD_123&token=SECRET_JWT_TOKEN&totp=998877")
echo "Response Body: ${LEAK_404_RES}"

LEAK_DETECTED=0
if echo "${LEAK_404_RES}" | grep -q "SUPER_SECRET_PASSWORD_123"; then
  echo "CRITICAL VULNERABILITY DETECTED: password leaked in 404 response payload!"
  LEAK_DETECTED=1
fi
if echo "${LEAK_404_RES}" | grep -q "SECRET_JWT_TOKEN"; then
  echo "CRITICAL VULNERABILITY DETECTED: token leaked in 404 response payload!"
  LEAK_DETECTED=1
fi
if echo "${LEAK_404_RES}" | grep -q "998877"; then
  echo "CRITICAL VULNERABILITY DETECTED: totp leaked in 404 response payload!"
  LEAK_DETECTED=1
fi

echo "4.2: Checking server log file for leaked sensitive parameters..."
# Send request to trigger logger
curl -s "${BASE_URL}/api/health?password=SUPER_SECRET_PASSWORD_123&token=SECRET_JWT_TOKEN&totp=998877&safe=hello" > /dev/null
# Send request with ADE URL as query parameter
curl -s "${BASE_URL}/api/ade?url=https://ade-outils.insa-lyon.fr/ADE-Cal:~student01!2025:SECRET_ADE_TOKEN_XYZ" > /dev/null
# Send request with malformed body and sensitive query parameter to trigger errorHandler
curl -s -X POST "${BASE_URL}/api/health?password=ERROR_LEAKED_PASSWORD" -H "Content-Type: application/json" -d '{"broken":' > /dev/null

sleep 0.5
echo "--- Server Logs Snippet ---"
cat /tmp/insa_server_test.log
echo "--- End of Server Logs ---"

LOG_LEAK=0
if grep -q "SUPER_SECRET_PASSWORD_123" /tmp/insa_server_test.log; then
  echo "CRITICAL VULNERABILITY: password leaked in server stdout/stderr logs!"
  LOG_LEAK=1
fi
if grep -q "SECRET_ADE_TOKEN_XYZ" /tmp/insa_server_test.log; then
  echo "CRITICAL VULNERABILITY: ADE secret token leaked in server stdout/stderr logs via query param!"
  LOG_LEAK=1
fi
if grep -q "ERROR_LEAKED_PASSWORD" /tmp/insa_server_test.log; then
  echo "CRITICAL VULNERABILITY: errorHandler logged raw req.originalUrl containing password to stderr!"
  LOG_LEAK=1
fi

# ---------------------------------------------------------
# Test 5: Error Handling & Payload Limits
# ---------------------------------------------------------
echo ""
echo "--- TEST 5: Boundary & Error Handling ---"

echo "5.1: Malformed JSON syntax error"
MALFORMED_RES=$(curl -s -i -X POST "${BASE_URL}/api/health" -H "Content-Type: application/json" -d '{"bad":')
echo "${MALFORMED_RES}" | grep -q "HTTP/1.1 400" || (echo "FAIL: Malformed JSON did not return 400" && exit 1)
echo "${MALFORMED_RES}" | grep -q "application/json" || (echo "FAIL: Malformed JSON did not return JSON" && exit 1)
echo "PASS: Malformed JSON returns 400 JSON."

echo "5.2: Oversized Payload (>1MB)"
# Generate a 1.2MB payload
python3 -c 'import sys; sys.stdout.write("{\"data\":\"" + "A"*1200000 + "\"}")' > /tmp/large_payload.json
LARGE_RES=$(curl -s -i -X POST "${BASE_URL}/api/mdw" -H "Content-Type: application/json" --data-binary "@/tmp/large_payload.json")
echo "${LARGE_RES}" | grep -q "HTTP/1.1 413" || (echo "FAIL: Large payload did not return 413" && exit 1)
rm -f /tmp/large_payload.json
echo "PASS: Oversized payload rejected with HTTP 413."

echo "5.3: HTTP Verb Tampering (POST /api/health)"
VERB_RES=$(curl -s -i -X POST "${BASE_URL}/api/health")
echo "${VERB_RES}" | grep -q "HTTP/1.1 404" || (echo "FAIL: POST /api/health did not return 404" && exit 1)
echo "PASS: Verb tampering on GET-only endpoint returns 404."

echo "=========================================================="
echo "TEST HARNESS SUMMARY:"
echo "Leak in 404 Response Payload: ${LEAK_DETECTED}"
echo "Leak in Server Log Output: ${LOG_LEAK}"
echo "=========================================================="

if [ ${LEAK_DETECTED} -ne 0 ] || [ ${LOG_LEAK} -ne 0 ]; then
  echo "STATUS: SECURITY VULNERABILITIES DETECTED"
  exit 2
else
  echo "STATUS: ALL ADVERSARIAL CHECKS PASSED"
  exit 0
fi
