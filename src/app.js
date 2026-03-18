const express = require('express');
const cookieParser = require('cookie-parser');


/* Routes */
const authRoutes = require('./routes/auth.routes');
const chatRoutes = require('./routes/chat.routes');



const app = express();


/* Using Middlewares */
app.use(express.json());    // Middleware to parse JSON bodies
app.use(cookieParser());    // Middleware to parse cookies



/* Using Routes */
app.use('/api/auth', authRoutes);    // Use auth routes for authentication-related endpoints
app.use('/api/chat', chatRoutes);    // Use chat routes for chat-related endpoints


module.exports = app;