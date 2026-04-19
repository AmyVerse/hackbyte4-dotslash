// Pulling from Vercel Environment Variables
const SPACETIMEDB_HOST = process.env.VITE_SPACETIMEDB_HOST;
const SPACETIMEDB_DB_NAME = process.env.VITE_SPACETIMEDB_DB_NAME;

const getHttpHost = (host) => {
  if (!host) return null;
  if (host.startsWith('wss://')) return host.replace('wss://', 'https://');
  if (host.startsWith('ws://')) return host.replace('ws://', 'http://');
  return host;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Ensure config is present
  if (!SPACETIMEDB_HOST || !SPACETIMEDB_DB_NAME) {
    console.error('CRITICAL: SpacetimeDB environment variables are missing on Vercel.');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const { from, latitude, longitude } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'Missing latitude/longitude' });
  }

  const httpHost = getHttpHost(SPACETIMEDB_HOST);
  const baseUrl = `${httpHost}/database/call/${SPACETIMEDB_DB_NAME}`;

  try {
    console.log(`Processing WhatsApp SOS for ${from}...`);

    // 1. Report Distress (Uses anonymous identity by default)
    const res1 = await fetch(`${baseUrl}/report_distress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([5, `WhatsApp SOS Signal from ${from}`, latitude, longitude])
    });

    if (!res1.ok) throw new Error(`Distress failed: ${await res1.text()}`);

    // 2. Update Location
    const res2 = await fetch(`${baseUrl}/update_location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([latitude, longitude, 'responder', 'rescue', null, null])
    });

    if (!res2.ok) throw new Error(`Location failed: ${await res2.text()}`);
    
    return res.status(200).json({ success: true, message: 'Broadcast successful' });
  } catch (error) {
    console.error('Webhook Error:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
