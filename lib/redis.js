const { Redis } = require('@upstash/redis');

const url =
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.KV_REST_API_URL;
const token =
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.KV_REST_API_TOKEN;

if (!url || !token) {
  console.warn('[redis] Missing UPSTASH_REDIS_REST_URL/TOKEN (or KV_REST_API_URL/TOKEN)');
}

const redis = new Redis({ url, token });

const KEYS = {
  registrations: 'wedding:registrations',
  likes: 'wedding:likes',
};

module.exports = { redis, KEYS };
