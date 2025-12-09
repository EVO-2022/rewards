const { Client } = require("pg");

const client = new Client({
  connectionString: "postgresql://admin:EVO%40Studios2022@99.107.152.134:5432/rewards",
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000, // 5 second hard timeout
});

client
  .connect()
  .then(() => {
    console.log("✅ Node connected to Postgres");
    return client.query("SELECT NOW()");
  })
  .then((res) => {
    console.log(res.rows);
    return client.end();
  })
  .catch((err) => {
    console.error("❌ Node connection failed:", err);
  });
