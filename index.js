require("dotenv").config({ path: "./config.env" });
const express = require("express");
const connectDB = require("./config/db");

// Connect DB
connectDB();

const app = express();
const cors = require("cors");

app.use(express.json());
app.use(cors);

app.use("/api/auth", require("./routes/auth"));

app.get("/", (req, res) => {
    res.send("Hello World!");
});

const server = app.listen(process.env.PORT || 5000, () => {
    console.log(`Example app listening`);
});

process.on("unhandledRejection", (err, promise) => {
    console.log(`logged error: ${err}`);
    server.close(() => process.exit(1));
});
