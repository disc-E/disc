const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

// Replace with your actual MongoDB connection string
const MONGO_URI = 'mongodb+srv://DISC:discE140@disc.nouqtkh.mongodb.net/zeitgeist?retryWrites=true&w=majority&appName=DISC';

// Optional: restrict manual reset to specific IPs
const ALLOWED_IPS = ['YOUR_IP_HERE']; // Add your IP here, or leave empty to allow all

app.use(cors());
app.use(express.json());

// MongoDB schema
const voteSchema = new mongoose.Schema({
  label: { type: String, required: true, lowercase: true, trim: true },
  count: { type: Number, default: 1 }
});

const Vote = mongoose.model('Vote', voteSchema);

// Connect to MongoDB
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Submit a vote
app.post('/vote', async (req, res) => {
  const { answer } = req.body;

  if (!answer || typeof answer !== 'string') {
    return res.status(400).json({ error: 'Invalid vote.' });
  }

  const label = answer.trim().toLowerCase();

  try {
    await Vote.findOneAndUpdate(
      { label },
      { $inc: { count: 1 } },
      { upsert: true, new: true }
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save vote' });
  }
});

// Get top 3 results
app.get('/results', async (req, res) => {
  try {
    const votes = await Vote.find().sort({ count: -1 }).limit(3);
    const results = votes.map(v => ({ label: v.label, count: v.count }));
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

// Manual reset (optional IP restriction)
app.post('/reset', async (req, res) => {
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;

  if (ALLOWED_IPS.length > 0 && !ALLOWED_IPS.includes(clientIp)) {
    return res.status(403).json({ error: 'Unauthorized IP' });
  }

  try {
    await Vote.deleteMany({});
    console.log(`🧹 Manual reset triggered by IP: ${clientIp}`);
    res.json({ success: true, message: 'Votes manually reset.' });
  } catch (err) {
    console.error('❌ Manual reset failed:', err);
    res.status(500).json({ error: 'Manual reset failed' });
  }
});

// Auto reset every day at 5:00 AM UTC = Midnight Eastern Time
cron.schedule('0 5 * * *', async () => {
  try {
    await Vote.deleteMany({});
    console.log('🔁 Auto reset of votes completed at midnight Eastern.');
  } catch (err) {
    console.error('❌ Auto reset failed:', err);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
