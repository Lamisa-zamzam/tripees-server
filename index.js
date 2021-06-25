require("dotenv").config({ path: "./.env" });
const express = require("express");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/error");
const cors = require("cors");
const crypto = require("crypto");
const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);
const JWT_AUTH_TOKEN = process.env.JWT_SECRET;
const JWT_REFRESH_TOKEN = process.env.JWT_REFRESH_SECRET;
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const { parse } = require("dotenv");
const smsKey = process.env.SMS_SECRET_KEY;
let refreshTokens = [];

// Connect DB
connectDB();

const app = express();

app.use(
    cors({
        credentials: true,
    })
);

// for parsing the req.body
app.use(express.json());

app.post("/sendOTP", (req, res) => {
    const phone = req.body.phone;
    const otp = Math.floor(100000 + Math.random() * 900000);
    const ttl = 2 * 60 * 1000;
    const expires = Date.now() + ttl;
    const data = `${phone}.${otp}.${expires}`;
    const hash = crypto.createHmac("sha256", smsKey).update(data).digest("hex");
    const fullHash = `${hash}.${expires}`;

    client.messages
        .create({
            body: `Your One Time Login Password For tripees.com is ${otp}`,
            from: +13073176533,
            to: phone,
        })
        .then((messages) => {})
        .catch((err) => res.send(err));
    res.status(200).send({ phone, hash: fullHash });
});

app.post("/verifyOTP", (req, res) => {
    const phone = req.body.phone;
    const hash = req.body.hash;
    const otp = parseInt(req.body.otp);
    let [hashValue, expires] = hash.split(".");

    let now = Date.now();
    if (now > parseInt(expires)) {
        return res.status(504).send({ msg: "Timeout. Please try again" });
    }
    expires = parseInt(expires);
    let data = `${phone}.${otp}.${expires}`;
    let newCalculatedHash = crypto
        .createHmac("sha256", smsKey)
        .update(data)
        .digest("hex");
    if (newCalculatedHash === hashValue) {
        res.send({ msg: "device verified" });
    } else {
        return res
            .status(400)
            .send({ verification: false, msg: "Incorrect OTP" });
    }
});

app.post("/checkPhone", async (req, res) => {
    const phone = req.body.phone;
    const user = await User.findOne({ phone });
    if (user) {
        return res.status(200).send({
            msg: "user found",
        });
    } else {
        res.status(404).send({
            success: false,
            msg: "user not found",
        });
    }
});

app.use("/api/auth", require("./routes/auth"));

app.use("/api/private", require("./routes/private"));

app.get("/", (req, res) => {
    res.send("Hello World!");
});

// Error Handle
app.use(errorHandler);

const server = app.listen(process.env.PORT || 5000, () => {
    console.log(`Example app listening`);
});

// Do not log error
process.on("unhandledRejection", (err, promise) => {
    console.log(`logged error: ${err}`);
    server.close(() => process.exit(1));
});
