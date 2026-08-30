// Vercel Serverless Function
// Route: /api/script?id=<scriptId>&key=<password>
//
// - Requests from Roblox (game:HttpGet) get RAW text/plain Lua, always.
// - Requests from a normal browser get a nice "enter password" page instead
//   of the raw code, so casually opening the link doesn't just dump the
//   script. This is a UX deterrent based on the User-Agent header, not real
//   security - a spoofed User-Agent bypasses it just like it bypasses most
//   script-locker sites of this kind.

const DB_URL = 'https://storage-all-tools-default-rtdb.asia-southeast1.firebasedatabase.app';

function luaError(message) {
  // Valid Lua statement, so if something goes wrong the script still
  // parses fine in Roblox and just throws a clean error() instead of
  // returning garbage HTML/JSON that would break loadstring().
  return `error(${JSON.stringify(message)})`;
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function fetchScript(id) {
  const dbRes = await fetch(`${DB_URL}/scripts/${encodeURIComponent(id)}.json`);
  if (!dbRes.ok) return undefined; // network/db error
  return await dbRes.json(); // null if not found, object if found
}

function gatePage(id, title) {
  const safeId = escapeHtml(id);
  const safeTitle = title ? escapeHtml(title) : 'Protected Script';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${safeTitle} - Michel Tools</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0;font-family:'Poppins',system-ui,sans-serif;}
  body{
    min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center;
    background:radial-gradient(circle at 20% -10%, rgba(59,130,246,.16), transparent 45%),
               radial-gradient(circle at 100% 30%, rgba(96,165,250,.08), transparent 40%), #0a0e1a;
    color:#eef1f8; padding:20px;
  }
  .brand{font-weight:800; font-size:15px; color:#60a5fa; margin-bottom:18px; letter-spacing:.02em;}
  .card{
    width:100%; max-width:380px; background:#121a2c; border:1px solid #233052; border-radius:16px;
    padding:26px 22px; text-align:center;
  }
  .lock{font-size:34px; margin-bottom:10px;}
  h1{font-size:18px; margin-bottom:4px;}
  .sub{font-size:12px; color:#8492b0; margin-bottom:20px;}
  input{
    width:100%; background:#0a0e1a; border:1px solid #233052; border-radius:9px; padding:11px 12px;
    color:#eef1f8; font-size:13px; outline:none; margin-bottom:12px; font-family:'Poppins',sans-serif;
  }
  input:focus{border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,.25);}
  button{
    width:100%; border:none; border-radius:10px; padding:12px 14px; font-weight:700; font-size:13px;
    cursor:pointer; background:linear-gradient(135deg,#3b82f6,#2563eb); color:#fff;
  }
  button:disabled{opacity:.6;}
  .status{font-size:11.5px; margin-top:12px; min-height:16px; color:#ff8a97;}
  .code-wrap{display:none; text-align:left; margin-top:16px;}
  .code-wrap.show{display:block;}
  pre{
    background:#080c16; border:1px solid #233052; border-radius:10px; padding:12px; max-height:340px;
    overflow:auto; font-family:'JetBrains Mono',monospace; font-size:11.5px; color:#60a5fa;
    white-space:pre-wrap; word-break:break-all; margin-bottom:10px;
  }
  .copy-btn{background:#182238; border:1px solid #233052; font-weight:600;}
  .home-link{margin-top:16px; font-size:11px; color:#54617e; text-decoration:none;}
</style>
</head>
<body>
  <div class="brand">&#9889; Michel Tools</div>
  <div class="card">
    <div class="lock">&#128274;</div>
    <h1>${safeTitle}</h1>
    <div class="sub">Enter the password to view this script</div>
    <input type="password" id="pw" placeholder="Script password">
    <button id="unlockBtn" onclick="unlock()">Unlock Script</button>
    <div class="status" id="status"></div>
    <div class="code-wrap" id="codeWrap">
      <pre id="codeOut"></pre>
      <button class="copy-btn" onclick="copyCode()">Copy Script</button>
    </div>
  </div>
  <a class="home-link" href="/">&larr; Back to Michel Tools</a>

<script>
  const scriptId = ${JSON.stringify(id)};
  let lastCode = '';

  async function unlock(){
    const pw = document.getElementById('pw').value;
    const btn = document.getElementById('unlockBtn');
    const status = document.getElementById('status');
    if (!pw){ status.textContent = 'Enter a password first'; return; }

    btn.disabled = true;
    status.style.color = '#8492b0';
    status.textContent = 'Checking...';

    try{
      const res = await fetch('/api/script?id=' + encodeURIComponent(scriptId) + '&key=' + encodeURIComponent(pw) + '&format=raw');
      const text = await res.text();

      if (text.startsWith('error(')){
        status.style.color = '#ff8a97';
        status.textContent = 'Wrong password';
      } else {
        status.textContent = '';
        lastCode = text;
        document.getElementById('codeOut').textContent = text;
        document.getElementById('codeWrap').classList.add('show');
      }
    }catch(err){
      status.style.color = '#ff8a97';
      status.textContent = 'Network error - try again';
    }finally{
      btn.disabled = false;
    }
  }

  function copyCode(){
    navigator.clipboard.writeText(lastCode);
    const status = document.getElementById('status');
    status.style.color = '#60a5fa';
    status.textContent = 'Copied to clipboard';
  }

  document.getElementById('pw').addEventListener('keydown', e => { if (e.key === 'Enter') unlock(); });
</script>
</body>
</html>`;
}

function notFoundPage() {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Not Found - Michel Tools</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0e1a;color:#eef1f8;font-family:system-ui,sans-serif;padding:20px;}
  .card{max-width:380px;text-align:center;}
  h1{font-size:18px;margin-bottom:8px;}
  p{font-size:12px;color:#8492b0;margin-bottom:16px;}
  a{color:#60a5fa;font-size:12px;text-decoration:none;}
</style></head>
<body><div class="card">
  <h1>&#10060; Script not found</h1>
  <p>This script doesn't exist or was deleted.</p>
  <a href="/">&larr; Back to Michel Tools</a>
</div></body></html>`;
}

module.exports = async (req, res) => {
  const { id, key, format } = req.query;
  const userAgent = req.headers['user-agent'] || '';
  const looksLikeBrowser = /Mozilla/i.test(userAgent);
  const wantsRaw = format === 'raw' || !looksLikeBrowser; // Roblox's HttpGet UA has no "Mozilla" in it

  if (!id) {
    if (wantsRaw) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.status(200).send(luaError('Missing script id'));
    } else {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(400).send(notFoundPage());
    }
    return;
  }

  let data;
  try {
    data = await fetchScript(id);
  } catch (err) {
    console.error('script.js fetch error:', err);
    if (wantsRaw) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.status(200).send(luaError('Server error, try again later'));
    } else {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(500).send(notFoundPage());
    }
    return;
  }

  if (data === undefined) {
    // could not reach the database
    if (wantsRaw) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.status(200).send(luaError('Could not reach the database'));
    } else {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(502).send(notFoundPage());
    }
    return;
  }

  if (!data) {
    res.setHeader('Cache-Control', 'no-store');
    if (wantsRaw) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.status(200).send(luaError('Script not found'));
    } else {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(404).send(notFoundPage());
    }
    return;
  }

  // Browser, no ?format=raw yet -> show the password gate page (never the code itself)
  if (!wantsRaw) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(gatePage(id, data.title));
    return;
  }

  // Raw path (Roblox HttpGet, or the gate page's own fetch with &format=raw): needs the correct key
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  if (typeof key !== 'string' || key !== data.pass) {
    res.status(200).send(luaError('Wrong password'));
    return;
  }

  res.status(200).send(typeof data.content === 'string' ? data.content : luaError('Script has no content'));
};
