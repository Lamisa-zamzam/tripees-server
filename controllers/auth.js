const User = require("../models/User");

exports.register = async (req, res, next) => {
    console.log("hello");
    const { username, email, password } = req.body;
    console.log(username);

    try {
        const user = await User.create({
            username,
            email,
            password,
        });
        res.status(200).json({
            success: true,
            user,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
        console.log(err);
    }
};
exports.login = async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        res.status(400).json({
            success: false,
            error: "Please provide email and password.",
        });
    }

    try {
        const user = await User.findOne({ email }).select("+password");
        res.status(404).json({ success: false, error: "Invalid credentials" });

        const isMatch = await user.matchPasswords(password);

        if (!isMatch) {
            res.status(404).json({
                success: false,
                error: "Invalid credentials.",
            });
        }

        res.status(200).json({
            success: true,
            token: "adsfpiohjewoifreomnvdjasfkljd",
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
        console.log(err);
    }
};
exports.forgotPassword = (req, res, next) => {
    res.send("Forgot Password");
};
exports.resetPassword = (req, res, next) => {
    res.send("Reset Password");
};
