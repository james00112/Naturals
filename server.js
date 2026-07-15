const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Connect to your MongoDB
mongoose.connect('mongodb://localhost:27017/plant_encyclopedia')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB Error:', err));

// Plant Schema (using your existing 'plant' collection)
const plantSchema = new mongoose.Schema({
  name: String,
  scientificName: String,
  category: String,
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
  difficulty: String,
  toxicity: String,
  tags: [String],
  commonUses: [String],
  funFacts: [String],
  contributor: String,
  isUserContribution: Boolean,
  likes: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
}, { collection: 'plant' }); // Uses your existing collection

const Plant = mongoose.model('Plant', plantSchema);

// GET all plants
app.get('/api/plants', async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = {};
    
    if (category && category !== 'all') query.category = category;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { scientificName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const plants = await Plant.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: plants, total: plants.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET single plant
app.get('/api/plants/:id', async (req, res) => {
  try {
    const plant = await Plant.findById(req.params.id);
    if (!plant) return res.status(404).json({ success: false, message: 'Not found' });
    
    plant.views = (plant.views || 0) + 1;
    await plant.save();
    
    res.json({ success: true, data: plant });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST new plant
app.post('/api/plants', async (req, res) => {
  try {
    const plant = await Plant.create(req.body);
    res.status(201).json({ success: true, data: plant });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST like
app.post('/api/plants/:id/like', async (req, res) => {
  try {
    const plant = await Plant.findByIdAndUpdate(
      req.params.id,
      { $inc: { likes: 1 } },
      { new: true }
    );
    res.json({ success: true, likes: plant?.likes || 0 });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET statistics
app.get('/api/stats', async (req, res) => {
  try {
    const total = await Plant.countDocuments();
    
    const categories = await Plant.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    
    const contributions = await Plant.countDocuments({ isUserContribution: true });
    
    // Convert to object
    const categoryObj = {};
    categories.forEach(c => {
      if (c._id) categoryObj[c._id] = c.count;
    });
    
    res.json({
      success: true,
      data: {
        total: total,
        categories: categoryObj,
        contributions: contributions
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Serve HTML
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📦 Database: plant_encyclopedia`);
  console.log(`📂 Collection: plant`);
});
