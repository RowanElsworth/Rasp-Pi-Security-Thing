require('dotenv').config()
const http = require('http');
const Gpio = require('onoff').Gpio;
const nodemailer = require('nodemailer');
const { MongoClient } = require('mongodb');
const io = require('socket.io-client');
const cors = require('cors');
const socket = io('http://192.168.1.228:3001', {'transports': ['websocket', 'polling']});
const express = require('express');

const app = express();
const corsOptions = {
  origin: 'http://192.168.1.228:3001',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

const server = http.createServer(app);

app.get('/', function(req, res) {
  res.setHeader('Content-Type', 'text/plain');
  res.write('Hello, World!');
  res.end();
});

// Constants
const LED_PIN_1 = 4;
const LED_PIN_2 = 18;
const PUSH_BUTTON_PIN = 17;
const PIR_PIN = 27;
const BZR_PIN = 21;

// Detection
class DetectionState {
  constructor() {
    this.detection = false; // The light's state. false == off, true == on.
    this.sensorEnabled = false; // The sensors state. false == off, true == on.
  }
  getDetectionState() {
    return this.detection;
  }
  setDetectionState(newState) {
    this.detection = newState;
  }
  getSensorEnabledState() {
    return this.sensorEnabled;
  }
  setSensorEnabledState(newState) {
    this.sensorEnabled = newState;
  }
}

const detectionState = new DetectionState();

// Hardware setup
const LED1 = new Gpio(LED_PIN_1, 'out');
LED1.writeSync(1);
const LED2 = new Gpio(LED_PIN_2, 'out');
const PUSH_BUTTON = new Gpio(PUSH_BUTTON_PIN, 'in', 'rising');
const PIR = new Gpio(PIR_PIN, 'in', 'both');
const BUZZER = new Gpio(BZR_PIN, 'out');

// Email setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

const sendEmail = () => {
  const mailOptions = {
    from: process.env.FROM_EMAIL,
    to: process.env.TO_EMAIL,
    subject: 'Motion Detected',
    text: `Motion has been detected at ${new Date().toLocaleString()}\n check the website at: ...`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
};

// Sound the buzzer for 1 second
const soundBuzzer = () => {
  let count = 0;
  const playBuzzer = () => {
    if (count < 5) {
      BUZZER.writeSync(1);
      setTimeout(() => {
        BUZZER.writeSync(0);
        count++;
        setTimeout(playBuzzer, 1000);
      }, 1000);
    } else {
      BUZZER.unexport();
    }
  };
  playBuzzer();
};

// Toggles the light and sensor
let blinkInterval = null;

const toggleLight = () => {
  let detection = detectionState.getDetectionState(); // Get current detection state
  detectionState.setDetectionState(!detection); // Toggle the detection state
  LED1.writeSync(detectionState.getDetectionState() ? 0 : 1);

  if (detectionState.getDetectionState()) { // Use updated detection state
    // Blink LED2 as a warning for 5 seconds before enabling the sensor
    let countDown = 6;
    let blinkInterval = setInterval(() => {
      LED2.writeSync(LED2.readSync() ^ 1);
      countDown--;
      console.log(`Sensor will be enabled in ${countDown} seconds`);
      if (countDown === 0) {
        clearInterval(blinkInterval);
        LED2.writeSync(1);
        detectionState.setSensorEnabledState(true); // Enable the sensor
        console.log('Sensor enabled');
      }
    }, 1000); // toggle every 1 second
  } else {
    // Turn off LED2 and disable the sensor
    clearInterval(blinkInterval);
    LED2.writeSync(0);
    detectionState.setSensorEnabledState(false); // Disable the sensor
    console.log('Sensor disabled');
  }
};

// Handles socket
socket.on('connect', () => {
  console.log('Connected to Express app via Socket.IO');
  
  socket.on('detection-control', (data) => {
    console.log('Received light-control event:', data);
    toggleLight();
  });

  socket.emit('ready', { message: 'Connected to Raspberry Pi', state: detectionState.getDetectionState() });

  socket.on('current-state-req', () => {
    socket.emit('current-state-push', { state: detectionState.getDetectionState() })
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Handles a message from the breadboard button
PUSH_BUTTON.watch((err, value) => {
  if (err) {
    console.error('Error with PUSH_BUTTON.watch:', err);
    return;
  }
  toggleLight();
  if (detectionState.getDetectionState()) {
    socket.emit('pi-activated', { message: 'Raspberry Pi button activated', value: true });
  } else {
    socket.emit('pi-activated', { message: 'Raspberry Pi button deactivated', value: false });
  }
});

// Sensor code
PIR.watch((err, value) => { // 'value' is from the sensor. 0 == no movement, 1 == movement.
  if (err) {
    console.error('Error with PIR.watch:', err);
    return;
  }
  if (detectionState.getSensorEnabledState() && value === 1) {
    console.log('Motion detected!');
    socket.emit('detection');
    sendEmail();
    soundBuzzer();
  }
});

// Start the server
server.listen(process.env.PORT, () => {
  console.log(`Server is hosted at http://localhost:${process.env.PORT}/`);
});