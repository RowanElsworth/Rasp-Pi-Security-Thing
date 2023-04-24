require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const session = require('express-session');
const mongoose = require('mongoose');

const { connectDB, disconnectDB } = require('./routes/db');

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

// middleware to check if the user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    // user is authenticated, continue with the request
    res.locals.username = req.session.user.username; // set username variable for views
    next();
  } else {
    // user is not authenticated, redirect to login page
    res.redirect('/login');
  }
}

// apply the isAuthenticated middleware to all routes except the login route
app.use((req, res, next) => {
  if (req.path === '/login') {
    // don't apply the middleware to the login route
    next();
  } else {
    isAuthenticated(req, res, next);
  }
});

// For authentication
const User = mongoose.model('User', new mongoose.Schema({
  username: String,
  password: String
}, { collection: 'users' }));

// handle login post request
app.post('/login', async (req, res) => {
  // connect to the database
  await connectDB('Login post request');

  // find a user with the provided username
  const user = await User.findOne({ username: req.body.username });

  // check if a user was found
  if (user) {
    // compare the hashed password in the database with the provided password
    const match = await bcrypt.compare(req.body.password, user.password);
    if (match) {
      req.session.user = user;
      await disconnectDB('Login post request');
      res.redirect('/logs');
    } else {
      await disconnectDB('Login post request');
      res.status(401).send('Invalid credentials');
    }
  } else {
    await disconnectDB('Login post request');
    res.status(401).send('Invalid credentials');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
    } else {
      res.redirect('/login');
    }
  });
});


// Logs to frontend
const logSchema = new mongoose.Schema({
  time: Date
}, { collection: 'log' });

const Log = mongoose.model('Log', logSchema);

app.get('/log', async (req, res) => {
  await connectDB('Get logs request');
  try {
    const log = await Log.find().exec();
    await disconnectDB('Get logs request');
    res.json(log);
  } catch (error) {
    console.error('Error retrieving log data', error);
    await disconnectDB('Get logs request');
    res.status(500).send('Error retrieving log data');
  }
});

const userLogSchema = new mongoose.Schema({
  username: String,
  action: String,
  time: Date,
  ip: String
}, { collection: 'user-actions' });

const UserLog = mongoose.model('UserLog', userLogSchema);

app.get('/user-actions', async (req, res) => {
  await connectDB('Get user logs request');
  try {
    const userLog = await UserLog.find().exec();
    await disconnectDB('Get logs request');
    res.json(userLog);
  } catch (error) {
    console.error('Error retrieving log data', error);
    await disconnectDB('Get user logs request');
    res.status(500).send('Error retrieving log data');
  }
});

app.get('/user-actions', async (req, res) => {
  await connectDB('Get user logs request');
  try {
    const userLog = await UserLog.find().exec();
    await disconnectDB('Get user logs request');
    res.json(userLog);
  } catch (error) {
    console.error('Error retrieving log data', error);
    await disconnectDB('Get user logs request');
    res.status(500).send('Error retrieving log data');
  }
});

app.get('/users', async (req, res) => {
  await connectDB('Get users request');
  try {
    const users = await User.find();
    await disconnectDB('Get users request');
    res.json(users);
  } catch (error) {
    console.error('Error retrieving log data', error);
    await disconnectDB('Get users request');
    res.status(500).send('Error retrieving log data');
  }
});

app.post('/users', async (req, res) => {
  const { username, password } = req.body;
  await connectDB('Add user request');
  try {
    // Check if user already exists
    const user = await User.findOne({ username });
    if (user) {
      await disconnectDB('Add user request');
      return res.status(409).send('User already exists');
    }

    // Hash password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user with hashed password
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    await disconnectDB('Add user request');
    res.status(201).send('User added successfully');
  } catch (error) {
    console.error('Error adding user', error);
    await disconnectDB('Add user request');
    res.status(500).send('Error adding user');
  }
});

app.put('/users/:id/password', async (req, res) => {
  await connectDB('Change user password request');
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      await disconnectDB('Change user password request');
      return res.status(404).send('User not found');
    }
    
    const newPassword = req.body.password;
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    user.password = hashedPassword;
    await user.save();
    await disconnectDB('Change user password request');
    res.send('Password changed successfully');
  } catch (error) {
    console.error('Error changing password', error);
    await disconnectDB('Change user password request');
    res.status(500).send('Error changing password');
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

app.get('/settings', async (req, res) => {
  res.render('settings', { username: res.locals.username });
});

// Start the server
connectDB('Starting the server')
  .then(() => {
    app.listen(process.env.PORT, () => {
      disconnectDB('Starting the server');
      console.log(`Server is hosted at http://localhost:${process.env.PORT}/`);
    });
  })
  .catch((err) => {
    disconnectDB('Starting the server');
    console.log(`Failed to connect to database: ${err}`);
  });
