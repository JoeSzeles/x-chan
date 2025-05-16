# Ngrok Setup Guide for Twitter Clone

This guide explains how to set up ngrok tunnels for both the frontend and backend of the Twitter Clone application.

## Prerequisites

1. Install ngrok globally:
```bash
npm install -g ngrok
```

2. Sign up for an ngrok account at https://dashboard.ngrok.com/signup
3. Get your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken
4. Configure ngrok with your authtoken:
```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

## Important Note About Free Plan Limitations

The free ngrok plan only allows 1 simultaneous tunnel. To work around this limitation, we have two options:

### Option 1: Use a Single Tunnel for Backend (Recommended)

1. Run only the backend tunnel:
```bash
ngrok http --region=ap 5000
```

2. Update the frontend configuration in `frontend/vite.config.js` to use the ngrok URL:
```javascript
export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: "YOUR_BACKEND_NGROK_URL", // e.g., https://8f0f39e81212.ngrok.app
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
```

3. Access the frontend directly through localhost:3000

### Option 2: Upgrade to a Paid Plan

If you need both tunnels simultaneously:
1. Upgrade to a paid ngrok plan at https://dashboard.ngrok.com/billing/plans
2. Then you can use the paid subdomain for frontend:
```bash
ngrok http --subdomain=tradehub --region=ap 3000
```

## Configuration

After starting the tunnel(s), update the frontend configuration in `frontend/vite.config.js`:

```javascript
export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: "YOUR_BACKEND_NGROK_URL", // e.g., https://8f0f39e81212.ngrok.app
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
```

## Verifying the Setup

1. If using Option 1 (single tunnel):
   - Backend should be accessible at your ngrok URL (e.g., https://8f0f39e81212.ngrok.app)
   - Frontend should be accessible at http://localhost:3000
   - Check the ngrok web interface at http://localhost:4040 to verify the tunnel is running

2. If using Option 2 (paid plan):
   - Frontend should be accessible at: https://tradehub.ap.ngrok.io
   - Backend URL will be shown in the ngrok interface at http://localhost:4040
   - Check the ngrok web interface at http://localhost:4040 to verify both tunnels are running

## Troubleshooting

1. If you see "authentication failed" error:
   - Verify your ngrok authtoken is correctly configured
   - Check if your account is verified
   - If using free plan, ensure you're not trying to run multiple tunnels

2. If tunnel doesn't start:
   - Make sure no other ngrok processes are running
   - Kill existing processes: `taskkill /F /IM ngrok.exe`
   - Try starting tunnel again

3. If frontend can't connect to backend:
   - Verify the backend URL in vite.config.js matches your ngrok URL
   - Check if both servers (frontend and backend) are running
   - Ensure CORS is properly configured in the backend

## Notes

- The free ngrok plan only allows 1 simultaneous tunnel
- For development, it's recommended to use Option 1 (single backend tunnel)
- If you need both tunnels, consider upgrading to a paid plan
- Remember to update the backend URL in vite.config.js whenever the backend tunnel is restarted 