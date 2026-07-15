const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://<username>:<password>@cluster.mongodb.net/plantera')
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Error:', err));

// Plant Schema
const plantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  scientificName: { type: String, required: true, unique: true },
  category: { type: String, required: true, enum: ['plant', 'tree', 'flower', 'fruit'] },
  description: String,
  detailedInfo: String,
  mainImage: String,
  images: [{ url: String, alt: String, caption: String }],
  careInstructions: {
    sunlight: String,
    water: String,
    soil: String,
    temperature: String
  },
  characteristics: {
    height: String,
    spread: String,
    growthRate: String,
    lifespan: String
  },
  origin: String,
  family: String,
  difficulty: { type: String, default: 'beginner' },
  toxicity: { type: String, default: 'non-toxic' },
  tags: [String],
  commonUses: [String],
  funFacts: [String],
  contributor: String,
  isUserContribution: { type: Boolean, default: false },
  likes: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const Plant = mongoose.model('Plant', plantSchema);

// API Routes
app.get('/api/plants', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 12 } = req.query;
    let query = {};
    
    if (category && category !== 'all') query.category = category;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { scientificName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { origin: { $regex: search, $options: 'i' } }
      ];
    }
    
    const plants = await Plant.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await Plant.countDocuments(query);
    
    res.json({
      success: true,
      data: plants,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/plants/:id', async (req, res) => {
  try {
    const plant = await Plant.findById(req.params.id);
    if (!plant) return res.status(404).json({ success: false, message: 'Not found' });
    
    // Increment views
    plant.views += 1;
    await plant.save();
    
    res.json({ success: true, data: plant });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/plants', async (req, res) => {
  try {
    const plant = await Plant.create(req.body);
    res.status(201).json({ success: true, data: plant });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.post('/api/plants/:id/like', async (req, res) => {
  try {
    const plant = await Plant.findByIdAndUpdate(
      req.params.id,
      { $inc: { likes: 1 } },
      { new: true }
    );
    res.json({ success: true, likes: plant.likes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const total = await Plant.countDocuments();
    const categories = await Plant.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    const contributions = await Plant.countDocuments({ isUserContribution: true });
    
    res.json({ success: true, data: { total, categories, contributions } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Serve HTML
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));