const { Server } = require("socket.io");
const cookie = require('cookie');
const jwt = require('jsonwebtoken');
const userModel = require('../models/user.model');
const aiService = require('../services/ai.service');
const messageModel = require('../models/message.model');
const { createMemory, queryMemory } = require('../services/vector.service');



function initSocketServer(httpServer) {

    const io = new Server(httpServer, {})

    // 
    io.use(async (socket, next) => {

        const cookies = cookie.parse(socket.handshake.headers?.cookie || "");
        // console.log('Socket Connection Cookies:', cookies);

        if(!cookies.token) {
            next(new Error('Authentication Error: No Token Provided'));
        }

        try{
            const decoded = jwt.verify(cookies.token, process.env.JWT_SECRET);

            const user = await userModel.findById(decoded.id);
            socket.user = user;
            next();

        } catch(err) {
            next(new Error('Authentication Error: Invalid Token'));
        }
    })

    io.on('connection', (socket) => {
        /*
        console.log('user connected: ', socket.user);
        console.log('new socket connection: ', socket.id);
        */
        socket.on('ai-message', async (messagePayload) => {

            console.log(messagePayload);

            const message = await messageModel.create({
                chat: messagePayload.chat,
                user: socket.user._id,
                content: messagePayload.content,
                role: 'user'
            })

            const vectors = await aiService.generateVector(messagePayload.content);
            
            /*
            console.log('vectors generated', vectors);
            console.log('vectors length', vectors?.length);
            */

            await createMemory({
                vectors,
                messageId: `${messagePayload.chat}-${Date.now()}`,
                // messageId: messageModel._id,
                metadata: {
                    chat: messagePayload.chat,
                    user: socket.user._id,
                    text: messagePayload.content,
                }
            })


            const chatHistory = (await messageModel.find({
                chat: messagePayload.chat
            }).sort({ createdAt: -1 }).limit(20).lean()).reverse();     //

            const response = await aiService.generateResponse(chatHistory.map(item => {
                return {
                    role: item.role,
                    parts: [{ text: item.content }]
                }
            }));

            const responseMessage = await messageModel.create({
                chat: messagePayload.chat,
                user: socket.user._id,
                content: response,
                role: 'model' 
            })

            const responseVectors = await aiService.generateVector(response);

            await createMemory({
                vectors: responseVectors,
                messageId: responseMessage._id,
                metadata: {
                    chat: messagePayload.chat,
                    user: socket.user._id,
                    text: response,
                }
            })

            const memory = await queryMemory({
                queryVector: vectors,
                limit: 3,
                metadata: {}
            })
            console.log(memory)


            socket.emit('ai-response', {
                content: response,
                chat: messagePayload.chat,
            })
        })

    })
}


module.exports = initSocketServer;