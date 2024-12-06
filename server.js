const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const nodemailer = require('nodemailer');
const app = express();
const port = 3001;

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'safespacedb',
});

app.use(cors());
app.use(express.json());

// Configure nodemailer transport
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'your-email@gmail.com', // Replace with your email
    pass: 'your-email-password', // Replace with your email password
  },
  debug: true,
  logger: true,
});

app.post('/register', (req, res) => {
  const { email, password } = req.body;
  console.log("Received request to register with email:", email);

  // Validate email format
  if (!/^[0-9]{7}@ub\.edu\.ph$/.test(email)) {
    return res.json({ success: false, message: 'Invalid email format. Please use a valid UB email address.' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000); // Generate a random 6-digit OTP

  const mailOptions = {
    to: email,
    from: 'no-reply@safespace.com',
    subject: 'SafeSpace OTP Verification',
    text: `Your OTP for SafeSpace registration is: ${otp}`,
  };

  // Send OTP via email
  transporter.sendMail(mailOptions, (err) => {
    if (err) {
      console.log('Error sending OTP:', err);
      return res.json({ success: false, message: 'Failed to send OTP. Please try again.' });
    }

    // Insert user data into database
    connection.query('INSERT INTO users (email, password, otp) VALUES (?, ?, ?)', [email, password, otp], (error, results) => {
      if (error) {
        console.log('Database Error:', error);
        return res.json({ success: false, message: 'Registration failed due to database error.' });
      }
      console.log("User registered successfully:", results);
      res.json({ success: true, message: 'OTP sent to your email. Please verify.', otp });
    });
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
