const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const MONGODB_URI = 'mongodb+srv://ydummy916_db_user:Slsu0124@webtesting.8sruqhq.mongodb.net/plant_encyclopedia';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB Atlas'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Plant Schema
const plantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  scientificName: { type: String, required: true },
  category: { type: String, required: true, enum: ['plant', 'tree', 'flower', 'fruit'] },
  description: { type: String, required: true },
  detailedInfo: { type: String, default: '' },
  mainImage: { type: String, default: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=400' },
  origin: { type: String, required: true },
  family: { type: String, default: '' },
  difficulty: { type: String, enum: ['beginner', 'intermediate', 'expert'], default: 'beginner' },
  toxicity: { type: String, enum: ['non-toxic', 'mildly-toxic', 'toxic'], default: 'non-toxic' },
  careInstructions: {
    sunlight: { type: String, default: '' },
    water: { type: String, default: '' },
    soil: { type: String, default: '' },
    temperature: { type: String, default: '' }
  },
  characteristics: { type: Object, default: {} },
  tags: { type: [String], default: [] },
  contributor: { type: String, default: 'Anonymous' },
  isUserContribution: { type: Boolean, default: true },
  likes: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  images: [{
    url: String,
    alt: String
  }]
}, { timestamps: true });

const Plant = mongoose.model('Plant', plantSchema);

// Routes

// GET all plants with optional filtering
app.get('/api/plants', async (req, res) => {
  try {
    const { category, search, limit = 20, page = 1 } = req.query;
    const query = {};
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { scientificName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const plants = await Plant.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Plant.countDocuments(query);
    
    res.json({
      success: true,
      data: plants,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching plants:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET single plant by ID
app.get('/api/plants/:id', async (req, res) => {
  try {
    const plant = await Plant.findById(req.params.id);
    if (!plant) {
      return res.status(404).json({ success: false, message: 'Plant not found' });
    }
    
    // Increment views
    plant.views += 1;
    await plant.save();
    
    res.json({ success: true, data: plant });
  } catch (error) {
    console.error('Error fetching plant:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST create new plant
app.post('/api/plants', async (req, res) => {
  try {
    const plantData = req.body;
    
    // Validate required fields
    const requiredFields = ['name', 'scientificName', 'category', 'description', 'origin'];
    for (const field of requiredFields) {
      if (!plantData[field]) {
        return res.status(400).json({ 
          success: false, 
          message: `Missing required field: ${field}` 
        });
      }
    }
    
    const plant = new Plant(plantData);
    await plant.save();
    
    res.status(201).json({ success: true, data: plant });
  } catch (error) {
    console.error('Error creating plant:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT update plant
app.put('/api/plants/:id', async (req, res) => {
  try {
    const plant = await Plant.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!plant) {
      return res.status(404).json({ success: false, message: 'Plant not found' });
    }
    
    res.json({ success: true, data: plant });
  } catch (error) {
    console.error('Error updating plant:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE plant
app.delete('/api/plants/:id', async (req, res) => {
  try {
    const plant = await Plant.findByIdAndDelete(req.params.id);
    if (!plant) {
      return res.status(404).json({ success: false, message: 'Plant not found' });
    }
    res.json({ success: true, message: 'Plant deleted successfully' });
  } catch (error) {
    console.error('Error deleting plant:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST like a plant
app.post('/api/plants/:id/like', async (req, res) => {
  try {
    const plant = await Plant.findById(req.params.id);
    if (!plant) {
      return res.status(404).json({ success: false, message: 'Plant not found' });
    }
    
    plant.likes += 1;
    await plant.save();
    
    res.json({ success: true, data: { likes: plant.likes } });
  } catch (error) {
    console.error('Error liking plant:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET statistics
app.get('/api/stats', async (req, res) => {
  try {
    const total = await Plant.countDocuments();
    const contributions = await Plant.countDocuments({ isUserContribution: true });
    
    const categories = await Plant.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    
    const categoriesObj = {};
    categories.forEach(item => {
      categoriesObj[item._id] = item.count;
    });
    
    res.json({
      success: true,
      data: {
        total,
        contributions,
        categories: categoriesObj
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET search plants by name/scientific name
app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.json({ success: true, data: [] });
    }
    
    const plants = await Plant.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { scientificName: { $regex: q, $options: 'i' } }
      ]
    }).limit(10);
    
    res.json({ success: true, data: plants });
  } catch (error) {
    console.error('Error searching plants:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (err) {
    console.error('Error closing MongoDB connection:', err);
    process.exit(1);
  }
});
