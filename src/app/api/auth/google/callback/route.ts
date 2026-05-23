import { NextRequest } from "next/server";
import { getOAuth2Client } from "@/lib/google";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return new Response("Missing authorization code", { status: 400 });
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    const refreshToken = tokens.refresh_token;

    if (!refreshToken) {
      // Sometimes Google only returns the refresh_token on the FIRST authorization.
      // If the app is already authorized, it will not return it unless prompt='consent' is used.
      // We forced prompt='consent', but let's add a comprehensive error layout just in case!
      const errorHtml = getErrorHtml(
        "No Refresh Token Received",
        "Google did not return a refresh token. This happens if the application was already granted access. Please visit your Google Account App Permissions, revoke access for this application, and click authorize again.",
      );
      return new Response(errorHtml, { headers: { "Content-Type": "text/html" } });
    }

    const successHtml = getSuccessHtml(refreshToken);
    return new Response(successHtml, {
      headers: { "Content-Type": "text/html" },
    });
  } catch (error: any) {
    const errorHtml = getErrorHtml("Authentication Failed", error.message);
    return new Response(errorHtml, {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
  }
}

function getSuccessHtml(refreshToken: string) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Google Drive OAuth Success - Atomus</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-gradient: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
      --accent: #6366f1;
      --accent-hover: #4f46e5;
      --glass-bg: rgba(30, 41, 59, 0.7);
      --glass-border: rgba(255, 255, 255, 0.08);
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg-gradient);
      color: var(--text-main);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      overflow-x: hidden;
    }

    .container {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      backdrop-filter: blur(16px);
      border-radius: 24px;
      padding: 40px;
      width: 100%;
      max-width: 600px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      text-align: center;
      animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .icon-container {
      width: 80px;
      height: 80px;
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      color: var(--accent);
    }

    .success-svg {
      width: 40px;
      height: 40px;
      animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both;
    }

    @keyframes scaleIn {
      from { transform: scale(0); }
      to { transform: scale(1); }
    }

    h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 12px;
      letter-spacing: -0.5px;
    }

    p {
      color: var(--text-muted);
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 32px;
    }

    .token-box {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--glass-border);
      border-radius: 12px;
      padding: 20px;
      text-align: left;
      margin-bottom: 24px;
      position: relative;
    }

    .token-label {
      font-size: 12px;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--accent);
      margin-bottom: 8px;
      letter-spacing: 1px;
    }

    .token-value {
      font-family: 'Courier New', Courier, monospace;
      font-size: 14px;
      word-break: break-all;
      color: var(--text-main);
      background: transparent;
      border: none;
      width: 100%;
      resize: none;
      height: 60px;
      outline: none;
      user-select: all;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--accent);
      color: white;
      border: none;
      padding: 14px 28px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      width: 100%;
    }

    .btn:hover {
      background: var(--accent-hover);
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(99, 102, 241, 0.3);
    }

    .btn:active {
      transform: translateY(0);
    }

    .instruction {
      font-size: 14px;
      color: var(--text-muted);
      margin-top: 24px;
      text-align: left;
      background: rgba(255, 255, 255, 0.03);
      padding: 16px;
      border-radius: 8px;
      border-left: 3px solid var(--accent);
    }

    .instruction ol {
      padding-left: 20px;
      margin-top: 8px;
    }

    .instruction li {
      margin-bottom: 6px;
    }

    .toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: #10b981;
      color: white;
      padding: 12px 24px;
      border-radius: 50px;
      font-weight: 600;
      box-shadow: 0 10px 20px rgba(16, 185, 129, 0.3);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      opacity: 0;
      pointer-events: none;
      z-index: 100;
    }

    .toast.show {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon-container">
      <svg class="success-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
    </div>
    <h1>Authentication Successful!</h1>
    <p>Your personal Google Drive connection is now authorized. Copy the generated Refresh Token below and add it to your configuration.</p>
    
    <div class="token-box">
      <div class="token-label">GOOGLE_REFRESH_TOKEN</div>
      <textarea id="tokenText" class="token-value" readonly>${refreshToken}</textarea>
    </div>

    <button class="btn" onclick="copyToken()">Copy Refresh Token</button>

    <div class="instruction">
      <strong>Next Steps:</strong>
      <ol>
        <li>Click <strong>Copy Refresh Token</strong> above.</li>
        <li>Open your <code>.env.local</code> file in your text editor.</li>
        <li>Add or update the variable: <br><code>GOOGLE_REFRESH_TOKEN=<i>[pasted_token]</i></code></li>
        <li>Restart your server to apply changes!</li>
      </ol>
    </div>
  </div>

  <div id="toast" class="toast">Token copied to clipboard!</div>

  <script>
    function copyToken() {
      const textarea = document.getElementById('tokenText');
      textarea.select();
      document.execCommand('copy');
      
      const toast = document.getElementById('toast');
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
      }, 3000);
    }
  </script>
</body>
</html>
  `;
}

function getErrorHtml(title: string, details: string) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Google Auth Error - Atomus</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-gradient: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
      --error: #ef4444;
      --glass-bg: rgba(30, 41, 59, 0.7);
      --glass-border: rgba(255, 255, 255, 0.08);
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg-gradient);
      color: var(--text-main);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .container {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      backdrop-filter: blur(16px);
      border-radius: 24px;
      padding: 40px;
      width: 100%;
      max-width: 550px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      text-align: center;
    }

    .icon-container {
      width: 80px;
      height: 80px;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      color: var(--error);
    }

    .error-svg {
      width: 40px;
      height: 40px;
    }

    h1 {
      font-size: 26px;
      font-weight: 700;
      margin-bottom: 12px;
      letter-spacing: -0.5px;
    }

    p {
      color: var(--text-muted);
      font-size: 15px;
      line-height: 1.6;
      margin-bottom: 32px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.1);
      color: var(--text-main);
      border: 1px solid var(--glass-border);
      padding: 12px 24px;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s ease;
      width: 100%;
    }

    .btn:hover {
      background: rgba(255, 255, 255, 0.15);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon-container">
      <svg class="error-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    </div>
    <h1>${title}</h1>
    <p>${details}</p>
    
    <a href="/api/auth/google" class="btn">Try Again</a>
  </div>
</body>
</html>
  `;
}
