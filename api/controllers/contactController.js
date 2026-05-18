const nodemailer = require('nodemailer');

// @desc    Send contact email
// @route   POST /api/contact
// @access  Public
exports.sendContactEmail = async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ message: 'Please provide all required fields' });
  }

  try {
    // Config: Placeholder (User needs to set these in .env)
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.mailtrap.io',
      port: process.env.EMAIL_PORT || 2525,
      auth: {
        user: process.env.EMAIL_USER || 'placeholder',
        pass: process.env.EMAIL_PASS || 'placeholder'
      }
    });

    const mailOptions = {
      from: `"${name}" <${email}>`,
      to: process.env.CONTACT_EMAIL || 'admin@timevault.app',
      subject: `[TimeVault Contact] ${subject || 'General Inquiry'}`,
      text: `Message from ${name} (${email}):\n\n${message}`
    };

    // Use sendMail (async)
    // For development, we'll log it if placeholders are used
    if (process.env.EMAIL_USER === 'placeholder' || !process.env.EMAIL_USER) {
      console.log('--- CONTACT FORM SUBMISSION ---');
      console.log(`From: ${name} (${email})`);
      console.log(`Msg: ${message}`);
      console.log('-------------------------------');
      return res.status(200).json({ message: 'Message received (Logged in developer console)' });
    }

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Email sent successfully' });

  } catch (err) {
    console.error('Nodemailer Error:', err);
    res.status(500).json({ message: 'Failed to send message' });
  }
};
