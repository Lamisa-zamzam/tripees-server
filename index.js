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
const smsKey = process.env.SMS_SECRET_KEY;
let refreshTokens = [];

// Connect DB
connectDB();

const app = express();

app.use(cors({ origin: "https://tranquil-escarpment-25384.herokuapp.com/" }));

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
            body: `Your One Time Login Password For Tripees.com is ${otp}`,
            from: +13073176533,
            to: phone,
        })
        .catch((err) => console.error(err));
    res.status(200).send({ phone, hash: fullHash, otp });
});

app.post("/verifyOTP", (req, res) => {
    const phone = req.body.phone;
    const hash = req.body.hash;
    const otp = req.body.otp;
    let [hashValue, expires] = hash.split(".");

    let now = Date.now();
    if (now > parseInt(expires)) {
        return res.status(504).send({ msg: `Timed out, Please try again` });
    }
    const data = `${phone}.${otp}.${expires}`;
    const newCalculatedHash = crypto
        .createHmac("sha256", smsKey)
        .update(data)
        .digest("hex");

    if (newCalculatedHash === hashValue) {
        const accessToken = jwt.sign({ data: phone }, JWT_AUTH_TOKEN, {
            expiresIn: "30s",
        });
        const refreshToken = jwt.sign({ data: phone }, JWT_REFRESH_TOKEN, {
            expiresIn: "1y",
        });
        refreshTokens.push(refreshToken);
        res.send({ msg: "device verified" });
    } else {
        return res
            .status(400)
            .send({ verification: false, msg: `Incorrect OTP` });
    }
});

async function authenticateUser(req, res, next) {
    jwt.verify(accessToken, JWT_AUTH_TOKEN, async (err, phone) => {
        if (phone) {
            req.phone = phone;
            next();
        } else if (err.message === "TokenExpired") {
            return res
                .status(403)
                .send({ success: false, msg: "Access token Expired" });
        } else {
            res.status(403).send({ err, msg: "User not authenticated" });
        }
    });
}

app.post("/home", authenticateUser, (req, res) => {
    res.status(202).send("Private Protected Route - Home");
});

app.post("/refresh", (req, res) => {
    // const refreshToken = req.cookies.refreshToken;
    if (!refreshToken)
        return res
            .status(403)
            .send({ message: "Refresh token not found, login again" });
    if (!refreshTokens.includes(refreshToken))
        return res
            .status(403)
            .send({ message: "Refresh token blocked, login again" });

    jwt.verify(refreshToken, JWT_REFRESH_TOKEN, (err, phone) => {
        if (!err) {
            const accessToken = jwt.sign({ data: phone }, JWT_AUTH_TOKEN, {
                expiresIn: "30s",
            });

            // .cookie("accessToken", accessToken, {
            //     expires: new Date(new Date().getTime() + 30 * 1000),
            //     // sameSite: "strict",
            //     httpOnly: true,
            // })
            // .cookie("authSession", true, {
            //     expires: new Date(new Date().getTime() + 30 * 1000),
            //     // sameSite: "strict",
            // })
            // .send({ previousSessionExpired: true, success: true });
        } else {
            return res.status(403).send({
                success: false,
                msg: "Invalid refresh token",
            });
        }
    });
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

// app.get("/logout", (req, res) => {
//     res.clearCookie("refreshToken")
//         .clearCookie("accessToken")
//         .clearCookie("authSession")
//         .clearCookie("refreshTokenID")
//         .send("User Logged out");
// });

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
