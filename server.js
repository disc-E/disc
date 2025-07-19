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

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
