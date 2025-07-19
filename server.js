const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect('mongodb+srv://DISC:discE140@disc.nouqtkh.mongodb.net/zeitgeist?retryWrites=true&w=majority&appName=DISC', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Define schema and model
const voteSchema = new mongoose.Schema({
  label: { type: String, required: true, lowercase: true, trim: true },
  count: { type: Number, default: 1 }
});

const Vote = mongoose.model('Vote', voteSchema);

// Endpoint to submit a vote
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


// Endpoint to fetch results
app.get('/results', async (req, res) => {
  try {
    const votes = await Vote.find().sort({ count: -1 }).limit(3); // top 3
    const results = votes.map(v => ({ label: v.label, count: v.count }));
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});
const allowedResetIP = '104.251.249.8'; // Replace with your real IP

// Endpoint to reset all votes (restricted to your IP)
app.delete('/reset', async (req, res) => {
  const clientIP =
    req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;

  // Log IP for debugging
  console.log(`Reset attempt from IP: ${clientIP}`);

  if (!clientIP.includes(allowedResetIP)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    await Vote.deleteMany({});
    res.json({ success: true, message: 'All votes have been reset.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reset votes' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
