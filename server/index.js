const keys = require("./keys");

// Express App Setup
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

// Create a new Express application
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Postgres Client Setup
const { Pool } = require("pg");
// Create a new Pool instance
const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  // Port to connect to
  port: keys.pgPort,
});

pgClient.on("connect", (client) => {
  client
    .query("CREATE TABLE IF NOT EXISTS values (number INT)")
    .catch((err) => console.error(err));
});

// Redis Client Setup
const redis = require("redis");
// Create a new Redis client instance
const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  // If we lose connection to Redis, try to reconnect every 1 second
  retry_strategy: () => 1000,
});

// Create a duplicate connection to Redis
const redisPublisher = redisClient.duplicate();

// Express route handlers

// Route handler for the root route
app.get("/", (req, res) => {
  res.send("Hi");
});

// Route handler for the /values/all route
app.get("/values/all", async (req, res) => {
  // Get all values from Postgres
  const values = await pgClient.query("SELECT * from values");
  // Send back all values
  res.send(values.rows);
});

// Route handler for the /values/current route
app.get("/values/current", async (req, res) => {
  // Get all values from Redis
  redisClient.hgetall("values", (err, values) => {
    res.send(values);
  });
});

// Route handler for the /values route
app.post("/values", async (req, res) => {
  // Get the index from the request body
  const index = req.body.index;
  // If index is greater than 40, send back an error
  if (parseInt(index) > 40) {
    return res.status(422).send("Index too high");
  }
  // Set the value of index to "Nothing yet!"
  redisClient.hset("values", index, "Nothing yet!");
  // Publish an insert event
  redisPublisher.publish("insert", index);
  // Insert the index into Postgres
  pgClient.query("INSERT INTO values(number) VALUES($1)", [index]);
  // Send back an empty response
  res.send({ working: true });
});

// Listen on port 5000
app.listen(5000, (err) => {
  console.log("Listening");
});
