import Redis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

const redis = new Redis(process.env.REDIS_URI);

redis.on('connect', ()=> console.log("redis connected"));
redis.on('error', (err)=> console.error(err));

export default redis;
