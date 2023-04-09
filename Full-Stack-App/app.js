require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const { ObjectId } = require('mongodb');
const session = require('express-session');

const { connectToDatabase, insertData, closeDatabaseConnection } = require('./routes/db');
const { authenticateUser } = require('./routes/auth')

const app = express();
const server = http.createServer(app);
const io = socketIO(server, { transports: ['websocket', 'polling'] });

// Enable CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://192.168.1.228');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Set up ejs template viewer
app.set('view engine', 'ejs');

// Express app
app.use(express.static(__dirname + '/public', { maxAge: 0, etag: false, lastModified: false, cacheControl: false }));

// Use body-parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configure and initialize session middleware
app.use(session({
  secret: process.env.SECRET_KEY,
  resave: false,
  saveUninitialized: false
}));

// Authentication middleware
const authenticateMiddleware = async (req, res, next) => {
  try {
    // Check if user is authenticated
    const { username, password } = req.session;
    // Skip authorization check for /login route
    if (req.path === '/login') {
      next();
      return;
    }
    const user = await authenticateUser(username, password);
    if (user) {
      // User is authenticated, continue to the next middleware or route handler
      next();
    } else {
      // User is not authenticated, redirect to login page or send unauthorized response
      res.redirect('/login');
    }
  } catch (error) {
    console.error('Error during authentication:', error);
    res.status(500).send('An error occurred during authentication.');
  }
};

// Use authentication middleware for all routes
app.use(authenticateMiddleware);

// Middleware to make username available in all routes
app.use((req, res, next) => {
  res.locals.username = req.session.username || '';
  next();
});

// Logout endpoint
app.get('/logout', (req, res) => {
  // Destroy session to log out the user
  req.session.destroy((err) => {
    if (err) {
      console.error('Error during logout:', err);
    }
    // Redirect to login page after logout
    res.redirect('/login');
  });
});

// Login endpoint
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  // Authenticate user
  const user = await authenticateUser(username, password);
  if (user) {
    // Set session data
    req.session.username = username;
    req.session.password = password;

    // Set username as global variable
    app.locals.username = username;
    res.redirect('/logs');
  } else {
    // Redirect to login page with error message
    res.redirect('/login?error=1');
  }
});

// Endpoint to log user actions
app.route('/user-actions')
  .get(async (req, res) => {
    try {
      // Retrieve user actions data from MongoDB
      const client = await connectToDatabase();
      const collection = client.db('security-db').collection('user-actions');
      const userActions = await collection.find().toArray();
      res.status(200).json(userActions);
      closeDatabaseConnection();
    } catch (error) {
      console.error('Error retrieving user actions:', error);
      res.status(500).json({ error: 'Failed to retrieve user actions.' });
      closeDatabaseConnection();
    }
  })
  .post(async (req, res) => {
    try {
      const username = req.session.username;
      const action = req.body;
    
      // Insert action data into MongoDB
      const client = await connectToDatabase();
      const collection = client.db('security-db').collection('user-actions');
      await collection.insertOne({
        username: username,
        action: action.action,
        time: new Date().toLocaleString(),
        ip: req.ip
      });
    
      res.status(200).json({ message: 'User action logged successfully.' });
      closeDatabaseConnection();
    } catch (error) {
      console.error('Error logging user action:', error);
      res.status(500).json({ error: 'Failed to log user action.' });
      closeDatabaseConnection();
    }
  });

// Routes
app.get('/log', async (req, res) => {
  try {
    const client = await connectToDatabase();
    const collection = client.db('security-db').collection('log');
    const logs = await collection.find().toArray();
    res.json(logs);
    closeDatabaseConnection();
  } catch (error) {
    console.error('Error retrieving data from MongoDB:', error);
    res.status(500).send('An error occurred while retrieving log data.');
    closeDatabaseConnection();
  }
});

const saltRounds = 10;
app.route('/users')
  .get(async (req, res) => {
    try {
      const client = await connectToDatabase();
      const collection = client.db('security-db').collection('users');
      const users = await collection.find().toArray();
      res.json(users);
      closeDatabaseConnection();
    } catch (error) {
      console.error('Error retrieving data from MongoDB:', error);
      res.status(500).send('An error occurred while retrieving users data.');
      closeDatabaseConnection();
    }
  })
  .post(async (req, res) => {
    try {
      // Extract user data from request body
      const { username, password } = req.body;

      // Hash password using bcrypt
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Insert user data into database
      const client = await connectToDatabase();
      const collection = client.db('security-db').collection('users');
      await collection.insertOne({ username, password: hashedPassword });

      // Return success response
      res.status(201).send('User added successfully.');
      closeDatabaseConnection();
    } catch (error) {
      console.error('Error adding user to MongoDB:', error);
      res.status(500).send('An error occurred while adding user data.');
      closeDatabaseConnection();
    }
  });

app.route('/users/:id/password')
  .put(async (req, res) => {
    try {
      // Extract user ID and new password from request parameters and body
      const userId = req.params.id;
      const { password } = req.body;

      // Hash new password using bcrypt
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Update user password in the database
      const client = await connectToDatabase();
      const collection = client.db('security-db').collection('users');
      await collection.updateOne({ _id: new ObjectId(userId) }, { $set: { password: hashedPassword } });

      // Return success response
      res.status(200).send('Password updated successfully.');
      closeDatabaseConnection();
    } catch (error) {
      console.error('Error updating user password in MongoDB:', error);
      res.status(500).send('An error occurred while updating user password.');
      closeDatabaseConnection();
    }
  });

app.post('/light', (req, res) => {
  // Emit a Socket.IO event to Raspberry Pi
  io.emit('detection-control', req.body.checked);
  res.send('Button click event handled and Socket.IO event emitted');
});

app.post('/current-state-req', (req, res) => {
  // Emit a Socket.IO event to Raspberry Pi
  io.emit('current-state-req');
  res.send('State requested from Pi');
});

// Use the io object to listen for connections and handle events
io.on('connection', (socket) => {
  socket.on('ready', (data) => {
    console.log(data.message);
    console.log(data.state);
  });

  socket.on('current-state-push', (data) => {
    console.log('Received data from Pi, Current detection state:', data.state);
    io.emit('current-state-front', data.state);
  });

  socket.on('pi-activated', (data) => {
    console.log(data.message);
    io.emit('pi-activated-front', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Pages
app.get('/login', async (req, res) => {
  res.render(__dirname + '/views/login.ejs');
});

app.get('/logs', (req, res) => {
  res.render('logs', { username: res.locals.username });
});

app.get('/manage_users', async (req, res) => {
  res.render('manage_users', { username: res.locals.username });
});

// Start the server
server.listen(process.env.PORT, () => {
  console.log(`Server is hosted at http://localhost:${process.env.PORT}/`);
});