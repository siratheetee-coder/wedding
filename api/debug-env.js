module.exports = async (req, res) => {
  const keys = Object.keys(process.env).filter((k) =>
    /UPSTASH|KV_|REDIS|BLOB/i.test(k)
  );
  const presence = Object.fromEntries(
    keys.map((k) => [k, process.env[k] ? `set (len ${process.env[k].length})` : 'empty'])
  );
  res.status(200).json({
    nodeVersion: process.version,
    redisRelatedEnvVars: keys,
    presence,
    hasUpstashUrl: !!(process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL),
    hasUpstashToken: !!(process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN),
  });
};
