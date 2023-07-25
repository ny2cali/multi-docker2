const keys = require("./keys");
const redis = require("redis");

const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  // If we lose connection to Redis, try to reconnect every 1 second
  retry_strategy: () => 1000,
});

// Create a duplicate connection to Redis
const sub = redisClient.duplicate();

// Calculate the Fibonacci value of index
function fib(index) {
  if (index < 2) return 1;
  return fib(index - 1) + fib(index - 2);
}

// Any time we get a new value, calculate the Fibonacci value of it
sub.on("message", (channel, message) => {
  redisClient.hset("values", message, fib(parseInt(message)));
});

// Subscribe to any insert events
sub.subscribe("insert");
