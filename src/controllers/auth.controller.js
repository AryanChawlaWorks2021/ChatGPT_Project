const userModel = require('../models/user.model');
const bcrypt = require('bcryptjs');   // For hashing passwords and comparing hashed passwords during login
const jwt = require('jsonwebtoken');    // For generating and verifying JSON Web Tokens (JWT) for authentication


async function registerUser(req, res) {

    const { fullName: { firstName, lastName }, email, password } = req.body;

    const isUserAlreadyExists = await userModel.findOne({ email });

    if(isUserAlreadyExists) {
        res.status(400).json({ message: 'User already exits' });
    }

    const hashPassword = await bcrypt.hash(password, 10);   // Hash the password with a salt round of 10 to enhance security
    const user = await userModel.create({
        fullName: {
            firstName, lastName
        },
        email,
        password: hashPassword
    })

    const token = jwt.sign({id: user._id}, process.env.JWT_SECRET)

    res.cookie('token', token)

    res.status(201).json({
        message: 'User registered successfully',
        user: {
            email: user.email,
            _id: user._id,
            fullName: user.fullName,
        }
    })

}

async function loginUser(req, res) {

    const { email, password } = req.body;

    const user = await userModel.findOne({ email });

    if(!user) {
        res.status(400).json({ message: 'Invalid email or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);   // Compare the provided password with the hashed password stored in the database

    if(!isPasswordValid) {
        res.json(400).json({ message: 'Invalid email or password' });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);   // Generate a JWT token with the user's ID as the payload and a secret key from environment variables

    res.cookie('token', token);   // Set the generated token as a cookie in the response to be stored on the client side for subsequent authenticated requests

    res.status(200).json({
        message: 'User logged in successfully',
        user: {
            email: user.email,
            id: user._id,
            fullName: user.fullName,
        }
    })
}



module.exports = {
    registerUser,
    loginUser,

}