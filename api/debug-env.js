module.exports = async (req, res) => {
  const keys = Object.keys(process.env).filter((k) =>
    /UPSTASH|KV_|REDIS|BLOB/i.test(k)
  );
  const presence = Object.fromEntries(
    keys.map((k) => [k, process.env[k] ? `set (len ${process.env[k].length})` : 'empty'])
  );
  const out = {
    nodeVersion: process.version,
    redisRelatedEnvVars: keys,
    presence,
    urlPrefix: (process.env.UPSTASH_REDIS_REST_URL || '').slice(0, 25),
  };
  try {
    const { Redis } = require('@upstash/redis');
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    const pingResult = await redis.ping();
    out.redisPing = pingResult;
    await redis.set('wedding:debug:test', { ts: Date.now() });
    const back = await redis.get('wedding:debug:test');
    out.roundtrip = back;
  } catch (err) {
    out.redisError = {
      message: err?.message,
      name: err?.name,
      stack: (err?.stack || '').split('\n').slice(0, 5),
    };
  }
  res.status(200).json(out);
};
