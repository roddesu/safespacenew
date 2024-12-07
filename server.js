const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = 3000;

// MySQL database connection setup
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',  // Update with your database username
  password: '',  // Update with your database password
  database: 'safespacedb',  // Your database name
});

app.use(cors());
app.use(express.json());

// Configure Nodemailer transport using Gmail
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,  // your email
    pass: process.env.EMAIL_PASS,  // your password (or app-specific password if using 2FA)
  },
  debug: true,  // Set debug to true for more detailed logs
  logger: true,
});

// Registration route to handle new users
app.post('/register', (req, res) => {
  const { email, password } = req.body;
  console.log("Received request to register with email:", email);

  // Validate email format
  if (!/^[0-9]{7}@ub\.edu\.ph$/.test(email)) {
    return res.json({ success: false, message: 'Invalid email format. Please use a valid UB email address.' });
  }

  // Hash the password before storing in the database
  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      console.log('Error hashing password:', err);
      return res.json({ success: false, message: 'An error occurred during registration. Please try again.' });
    }

    // Generate a random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000); 

    // Email options for OTP
    const mailOptions = {
      to: email,
      from: 'no-reply@safespace.com',  // Your from email
      subject: 'SafeSpace OTP Verification',
      text: `Your OTP for SafeSpace registration is: ${otp}`,
    };

    // Send OTP via email
    transporter.sendMail(mailOptions, (err) => {
      if (err) {
        console.log('Error sending OTP:', err);
        return res.json({ success: false, message: 'Failed to send OTP. Please try again.' });
      }

      // Insert user data into the database (email, hashed password, and OTP)
      connection.query('INSERT INTO users (email, password, otp) VALUES (?, ?, ?)', [email, hashedPassword, otp], (error, results) => {
        if (error) {
          console.log('Database Error:', error);
          return res.json({ success: false, message: 'Registration failed due to database error.' });
        }

        console.log("User registered successfully:", results);
        res.json({ success: true, message: 'OTP sent to your email. Please verify.', otp });
      });
    });
  });
});

// OTP verification route
app.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;

  // Validate OTP against the stored OTP in the database
  connection.query('SELECT * FROM users WHERE email = ? AND otp = ?', [email, otp], (error, results) => {
    if (error) {
      console.log('Database Error:', error);
      return res.json({ success: false, message: 'Database error occurred. Please try again.' });
    }

    if (results.length === 0) {
      return res.json({ success: false, message: 'Invalid OTP. Please try again.' });
    }

    // OTP is valid, complete registration (e.g., mark the user as verified)
    connection.query('UPDATE users SET otp_verified = 1 WHERE email = ?', [email], (err) => {
      if (err) {
        console.log('Database Error:', err);
        return res.json({ success: false, message: 'Error completing registration.' });
      }

      res.json({ success: true, message: 'Registration complete. You are now verified.' });
    });
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
