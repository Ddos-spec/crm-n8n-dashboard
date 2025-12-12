# Troubleshooting CORS & Backend Issues

## The "CORS Error" Misconception
If you see a CORS error like:
`Access to XMLHttpRequest at '...' from origin '...' has been blocked by CORS policy`
**AND** you also see a **500 Internal Server Error** in your console/network tab.

It usually means:
1. Your Node.js backend **crashed** or **failed to start**.
2. Because it crashed, the Nginx/Easypanel proxy took over and returned a default "500 Error" page.
3. This default error page **does not have CORS headers**.
4. The browser sees the missing headers and reports a "CORS Error".

**The Real Problem:** It is likely a Database Connection Error or Environment Variable issue, NOT a CORS configuration issue.

## What Changed?
We modified `server.js` and `db.js` to be more resilient:
1.  **Prevent Crash:** If the database connection fails on startup, the server will **no longer exit**. It will log the error and start anyway.
2.  **Increased Timeout:** We increased the database connection timeout to 5 seconds.
3.  **Debug Logs:** The server will print more details about incoming requests and origins.

## How to Debug on VPS (Easypanel)
1.  **Deploy the changes** to your VPS.
2.  Check the **Application Logs** in Easypanel.
    *   Look for lines starting with `❌ Database connection failed`.
    *   If you see this, your `DB_HOST`, `DB_USER`, `DB_PASSWORD`, etc., are incorrect or the database is not reachable from the backend container.
3.  Check the **Network Tab** in your browser (F12).
    *   Refresh the page.
    *   Even if the database is down, you should now receive a JSON response from `/api/stats` (likely saying "Database connection failed") instead of a generic HTML 500 page.
    *   This confirms the CORS headers are now working, and the issue is indeed the database.

## Next Steps
If the logs say "Database connection failed":
*   Verify your `.env` variables in Easypanel.
*   Ensure your PostgreSQL database is running.
*   If using an internal network in Easypanel, make sure you are using the internal service name (e.g., `postgres` or `db`) as the `DB_HOST`.
