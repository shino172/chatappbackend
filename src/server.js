// src/server.js
// const express = require('express');
// const http = require('http');
// const { Server } = require('socket.io');
// const cors = require('cors');
// require('dotenv').config();
// const db = require('./db');

// const app = express();
// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: '*', 
//     methods: ['GET', 'POST'],
//   },
// });

// // Middleware
// app.use(cors());
// app.use(express.json());

// app.get('/users/:userId', async (req, res) => {
//   const { userId } = req.params;

//   try {
//     // Kiá»ƒm tra trong báº£ng user
//     let userQuery = await db.query('SELECT name, profile_image_url FROM "user" WHERE id = $1', [userId]);
//     if (userQuery.rows.length > 0) {
//       return res.json({
//         id: userId,
//         name: userQuery.rows[0].name,
//         profileImageUrl: userQuery.rows[0].profile_image_url || '',
//         role: 'user',
//       });
//     }

//     // Kiá»ƒm tra trong báº£ng driver
//     let driverQuery = await db.query('SELECT name, profile_image_url FROM driver WHERE id = $1', [userId]);
//     if (driverQuery.rows.length > 0) {
//       return res.json({
//         id: userId,
//         name: driverQuery.rows[0].name,
//         profileImageUrl: driverQuery.rows[0].profile_image_url || '',
//         role: 'driver',
//       });
//     }

//     return res.status(404).json({ error: 'User not found' });
//   } catch (error) {
//     console.error('Error fetching user:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

// // API Ä‘á»ƒ láº¥y danh sÃ¡ch phÃ²ng chat 
// app.get('/chat-rooms/:userId', async (req, res) => {
//   const { userId } = req.params;

//   try {
//     const roomsQuery = await db.query(
//       `
//       SELECT mr.id, mr.user_id, mr.driver_id,
//              (SELECT m.message_text 
//               FROM messages m 
//               WHERE m.message_room_id = mr.id 
//               ORDER BY m.timestamp DESC 
//               LIMIT 1) as last_message
//       FROM message_room mr
//       WHERE mr.user_id = $1 OR mr.driver_id = $1
//       `,
//       [userId]
//     );

//     const chatRooms = await Promise.all(
//       roomsQuery.rows.map(async (room) => {
//         const otherUserId = room.user_id === userId ? room.driver_id : room.user_id;
//         let otherUserName = 'Unknown User';
//         let role = 'user';

//         try {
//           if (room.user_id === userId) {
//             const driverQuery = await db.query('SELECT name FROM driver WHERE id = $1', [otherUserId]);
//             if (driverQuery.rows.length > 0) {
//               otherUserName = driverQuery.rows[0].name;
//               role = 'driver';
//             }
//           } else {
//             const userQuery = await db.query('SELECT name FROM "user" WHERE id = $1', [otherUserId]);
//             if (userQuery.rows.length > 0) {
//               otherUserName = userQuery.rows[0].name;
//               role = 'user';
//             }
//           }
//         } catch (error) {
//           console.error(`Error fetching name for ${otherUserId}:`, error);
//         }

//         return {
//           id: room.id,
//           user_id: room.user_id,
//           driver_id: room.driver_id,
//           otherUser: { id: otherUserId, name: otherUserName, role },
//           lastMessage: room.last_message || 'No messages yet',
//         };
//       })
//     );

//     res.json(chatRooms);
//   } catch (error) {
//     console.error('Error fetching chat rooms:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

// app.get('/messages/:roomId', async (req, res) => {
//   const { roomId } = req.params;

//   try {
//     const messagesQuery = await db.query(
//       'SELECT id, sender_id, message_text, timestamp FROM messages WHERE message_room_id = $1 ORDER BY timestamp ASC',
//       [roomId]
//     );

//     const messages = messagesQuery.rows.map((msg) => ({
//       id: msg.id.toString(),
//       sender_id: msg.sender_id,
//       message_text: msg.message_text,
//       timestamp: new Date(msg.timestamp).toLocaleTimeString(),
//     }));

//     res.json(messages);
//   } catch (error) {
//     console.error('Error fetching messages:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

// // WebSocket 
// io.on('connection', (socket) => {
//   console.log('A user connected:', socket.id);

//   // 
//   socket.on('joinRoom', (roomId) => {
//     socket.join(roomId);
//     console.log(`User ${socket.id} joined room ${roomId}`);
//   });

//   // 
//   socket.on('sendMessage', async ({ roomId, message }) => {
//     try {
//       console.log('Received sendMessage:', { roomId, message }); 
//       const result = await db.query(
//         'INSERT INTO messages (sender_id, message_room_id, message_text, timestamp) VALUES ($1, $2, $3, NOW()) RETURNING id, timestamp',
//         [message.sender_id, roomId, message.message_text]
//       );

//       const savedMessage = {
//         id: result.rows[0].id.toString(),
//         sender_id: message.sender_id,
//         message_text: message.message_text,
//         timestamp: new Date(result.rows[0].timestamp).toLocaleTimeString(),
//       };

//       console.log('Emitting message to room:', roomId, savedMessage);
//       io.to(roomId).emit('message', savedMessage);
//     } catch (error) {
//       console.error('Error saving message:', error);
//     }
//   });

//   // 
//   socket.on('typing', ({ roomId, userId }) => {
//     socket.to(roomId).emit('typing', { roomId, userId });
//   });

//   socket.on('stopTyping', ({ roomId, userId }) => {
//     socket.to(roomId).emit('stopTyping', { roomId, userId });
//   });

//   socket.on('disconnect', () => {
//     console.log('User disconnected:', socket.id);
//   });
// });

// const PORT = process.env.PORT || 3000;
// server.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });


require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Cho phép tất cả origin, bạn có thể giới hạn sau
  },
});

// Kết nối đến Neon
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.use(express.json());

// API lấy thông tin người dùng
app.get('/users/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    let userQuery = await db.query('SELECT name, profile_image_url FROM "user" WHERE id = $1', [userId]);
    if (userQuery.rows.length > 0) {
      return res.json({
        id: userId,
        name: userQuery.rows[0].name,
        profileImageUrl: userQuery.rows[0].profile_image_url || '',
        role: 'user',
      });
    }

    let driverQuery = await db.query('SELECT name, profile_image_url FROM driver WHERE id = $1', [userId]);
    if (driverQuery.rows.length > 0) {
      return res.json({
        id: userId,
        name: driverQuery.rows[0].name,
        profileImageUrl: driverQuery.rows[0].profile_image_url || '',
        role: 'driver',
      });
    }

    return res.status(404).json({ error: 'User not found' });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API lấy danh sách phòng chat
app.get('/chat-rooms/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    let isDriver = false;
    let userQuery = await db.query('SELECT id FROM "user" WHERE id = $1', [userId]);
    if (userQuery.rows.length === 0) {
      let driverQuery = await db.query('SELECT id FROM driver WHERE id = $1', [userId]);
      if (driverQuery.rows.length > 0) {
        isDriver = true;
      } else {
        return res.status(404).json({ error: 'User not found' });
      }
    }

    const roomsQuery = await db.query(
      `
      SELECT mr.id, mr.user_id, mr.driver_id,
             (SELECT m.message_text 
              FROM messages m 
              WHERE m.message_room_id = mr.id 
              ORDER BY m.timestamp DESC 
              LIMIT 1) as last_message
      FROM message_room mr
      WHERE mr.user_id = $1 OR mr.driver_id = $1
      `,
      [userId]
    );

    const chatRooms = await Promise.all(
      roomsQuery.rows.map(async (room) => {
        const otherUserId = room.user_id === userId ? room.driver_id : room.user_id;
        let otherUser = { id: otherUserId, name: 'Unknown User', profileImageUrl: '' };

        if (isDriver) {
          const userQuery = await db.query(
            'SELECT name, profile_image_url FROM "user" WHERE id = $1',
            [otherUserId]
          );
          if (userQuery.rows.length > 0) {
            otherUser.name = userQuery.rows[0].name;
            otherUser.profileImageUrl = userQuery.rows[0].profile_image_url || '';
          }
        } else {
          const driverQuery = await db.query(
            'SELECT name, profile_image_url FROM driver WHERE id = $1',
            [otherUserId]
          );
          if (driverQuery.rows.length > 0) {
            otherUser.name = driverQuery.rows[0].name;
            otherUser.profileImageUrl = driverQuery.rows[0].profile_image_url || '';
          }
        }

        return {
          id: room.id,
          user_id: room.user_id,
          driver_id: room.driver_id,
          otherUser,
          lastMessage: room.last_message || 'No messages yet',
        };
      })
    );

    res.json(chatRooms);
  } catch (error) {
    console.error('Error fetching chat rooms:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API lấy danh sách tin nhắn
app.get('/messages/:chatId', async (req, res) => {
  const { chatId } = req.params;

  try {
    const messagesQuery = await db.query(
      'SELECT id, message_text, sender_id, timestamp FROM messages WHERE message_room_id = $1 ORDER BY timestamp ASC',
      [chatId]
    );
    res.json(messagesQuery.rows);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API lưu tin nhắn
app.post('/messages', async (req, res) => {
  const { message_room_id, sender_id, message_text } = req.body;

  try {
    const result = await db.query(
      'INSERT INTO messages (message_room_id, sender_id, message_text, timestamp) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [message_room_id, sender_id, message_text]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error saving message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API lưu push token
app.post('/users/:userId/push-token', async (req, res) => {
  const { userId } = req.params;
  const { pushToken } = req.body;

  try {
    let userQuery = await db.query('UPDATE "user" SET push_token = $1 WHERE id = $2 RETURNING *', [pushToken, userId]);
    if (userQuery.rows.length > 0) {
      return res.json({ success: true });
    }

    let driverQuery = await db.query('UPDATE driver SET push_token = $1 WHERE id = $2 RETURNING *', [pushToken, userId]);
    if (driverQuery.rows.length > 0) {
      return res.json({ success: true });
    }

    return res.status(404).json({ error: 'User not found' });
  } catch (error) {
    console.error('Error saving push token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Socket.IO xử lý tin nhắn thời gian thực
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on('sendMessage', async ({ roomId, message }) => {
    try {
      const result = await db.query(
        'INSERT INTO messages (message_room_id, sender_id, message_text, timestamp) VALUES ($1, $2, $3, NOW()) RETURNING *',
        [roomId, message.sender_id, message.message_text]
      );
      const savedMessage = result.rows[0];
      io.to(roomId).emit('message', savedMessage);
    } catch (error) {
      console.error('Error saving message:', error);
    }
  });

  socket.on('typing', ({ roomId, userId }) => {
    socket.to(roomId).emit('typing', { roomId, userId });
  });

  socket.on('stopTyping', ({ roomId, userId }) => {
    socket.to(roomId).emit('stopTyping', { roomId, userId });
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
  });
});

// Render sử dụng biến môi trường PORT
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});