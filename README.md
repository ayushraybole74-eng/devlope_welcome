# AYS+ARP Welcome Dashboard

## Deploy
1. Upload these files to a new GitHub repository.
2. On Render choose New > Web Service and connect the repository.
3. Build command: `npm install`; Start command: `npm start`.
4. Add the variables from `.env.example` in Render.
5. In Discord Developer Portal > OAuth2, add the exact `DISCORD_REDIRECT_URI` as a redirect URL.
6. Use the Discord application's Client ID and Client Secret as Render environment variables. Never post the secret or dashboard API key in chat.

## BDFD connection
The dashboard saves welcome settings. It does not directly edit BDFD commands. The BDFD command must fetch:
`https://YOUR-RENDER-SERVICE.onrender.com/api/bdfd/config?guild=YOUR_SERVER_ID`
Add the HTTP header `x-dashboard-key` with your `DASHBOARD_API_KEY` before the request. Keep that key private.

## Storage
This starter stores settings in `data.json`. Render's local disk may reset on redeploy/restart. Add a persistent disk or database before relying on it long-term.
