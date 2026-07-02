const SUPABASE_URL = 'https://ovcjzsrqqgjsbqswtkro.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92Y2p6c3JxcWdqc2Jxc3d0a3JvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2MjIxNjIsImV4cCI6MjA5NjE5ODE2Mn0._sPE8K26oTCEGlxBaG_vBk-U2yDNKFV1por5YIv8xko';

module.exports = async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api/, '') || '/';
  const target = `${SUPABASE_URL}${path}${url.search}`;

  const headers = {
    'Content-Type': 'application/json',
    'apikey': req.headers.apikey || ANON_KEY
  };

  if (req.headers.authorization) {
    headers['Authorization'] = req.headers.authorization;
  }

  const options = {
    method: req.method,
    headers
  };

  if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
    options.body = JSON.stringify(req.body);
  }

  try {
    const response = await fetch(target, options);
    const contentType = response.headers.get('content-type') || 'application/json';
    const data = await response.text();
    res.status(response.status).setHeader('Content-Type', contentType).send(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Proxy failed' });
  }
};
