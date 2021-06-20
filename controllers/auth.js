const User = require("../models/User");
const ErrorResponse = require("../utils/errorResponse");

exports.register = async (req, res, next) => {
    const { username, email, password, phone } = req.body;

    try {
        const user = await User.create({
            username,
            email,
            password,
            phone,
        });

        sendToken(user, 200, res);
    } catch (err) {
        next(err);
    }
};

exports.login = async (req, res, next) => {
    const { email, password, phone } = req.body;

    if (!phone && (!email || !password)) {
        return next(
            new ErrorResponse(
                "Please provide an email and password or phone number.",
                400
            )
        );
    }

    try {
        let user;
        if (email && password) {
            user = await User.findOne({ email }).select("+password");
            const isMatch = await user.matchPasswords(password);

            if (!isMatch) {
                return next(new ErrorResponse("Invalid Credentials", 401));
            }
            sendToken(user, 200, res);
        } else {
            user = await User.findOne({ phone });
            sendToken(user, 200, res);
        }
        if (!user) {
            return next(new ErrorResponse("Invalid Credentials", 401));
        }
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
};

exports.forgotPassword = async (req, res, next) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return next(new ErrorResponse("Email could not be sent.", 404));
        }

        const resetToken = user.getResetPasswordToken();

        await user.save();

        const resetUrl = `http://localhost:3000/passwordReset/${resetToken}`;

        const message = `
        <h1>You have requested a password reset</h1>
        <p>Please go to this link to reset your password</p>
        <a href="${resetUrl}" clicktracking="off">${resetUrl}</a>
        `;

        try {
        } catch (err) {}
    } catch (err) {}
};

exports.resetPassword = (req, res, next) => {
    res.send("Reset Password");
};

const sendToken = (user, statusCode, res) => {
    const token = user.getSignedToken();
    res.status(statusCode).json({ success: true, token });
};
