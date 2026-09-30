const { createClient } = require('redis');

const redisClient = createClient({
    url: 'redis://redis:6379'
});

redisClient.on('error', (err) => {
    console.log('Redis Client Error', err);
});

redisClient.connect()
    .then(() => {
        console.log('Connected to Redis');
    })
    .catch((err) => {
        console.error('Could not connect to Redis', err);
        process.exit(1);
    });

module.exports = redisClient;