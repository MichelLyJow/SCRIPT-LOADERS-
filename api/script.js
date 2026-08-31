// Vercel Serverless Function
// Route: /api/script?id=<scriptId>&key=<password>
// ALWAYS returns raw text/plain Lua - no exceptions, no HTML.
// This must stay 100% predictable because game:HttpGet needs plain text,
// and many Roblox executors spoof a normal browser User-Agent, so trying
// to detect "is this a browser?" here is not reliable.
//
// For a human-friendly password-gate preview page, use the main app link
// instead: https://your-app.vercel.app/?id=<scriptId>

const DB_URL = 'https://storage-all-tools-default-rtdb.asia-southeast1.firebasedatabase.app';

function luaError(message) {
  // Valid Lua statement, so if something goes wrong the script still
  // parses fine in Roblox and just throws a clean error() instead of
  // returning garbage HTML/JSON that would break loadstring().
  return `error(${JSON.stringify(message)})`;
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  const { id, key } = req.query;

  if (!id) {
    res.status(200).send(luaError('Missing script id'));
    return;
  }

  try {
    const dbRes = await fetch(`${DB_URL}/scripts/${encodeURIComponent(id)}.json`);
    if (!dbRes.ok) {
      res.status(200).send(luaError('Could not reach the database'));
      return;
    }

    const data = await dbRes.json();

    if (!data) {
      res.status(200).send(luaError('Script not found'));
      return;
    }

    if (typeof key !== 'string' || key !== data.pass) {
      res.status(200).send(luaError('Wrong password'));
      return;
    }

    res.status(200).send(typeof data.content === 'string' ? data.content : luaError('Script has no content'));
  } catch (err) {
    console.error('script.js error:', err);
    res.status(200).send(luaError('Server error, try again later'));
  }
};
