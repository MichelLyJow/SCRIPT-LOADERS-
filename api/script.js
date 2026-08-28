// Vercel Serverless Function
// Route: /api/script?id=<scriptId>&key=<password>
// Returns RAW text/plain (never HTML/JSON) so it's safe to use with:
//   loadstring(game:HttpGet("https://your-app.vercel.app/api/script?id=xxx&key=xxx"))()

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
