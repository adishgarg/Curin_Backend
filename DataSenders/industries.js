const express = require('express');
const router = express.Router();

// Comprehensive list of industries
const industries = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Manufacturing',
  'Retail',
  'Real Estate',
  'Transportation',
  'Energy',
  'Agriculture',
  'Construction',
  'Media & Entertainment',
  'Professional Services',
  'Government',
  'Non-Profit',
  'Hospitality',
  'Telecommunications',
  'Automotive',
  'Aerospace',
  'Pharmaceuticals',
  'Biotechnology',
  'Food & Beverage',
  'Fashion',
  'Sports & Recreation',
  'Environmental Services',
  'Consulting',
  'Legal Services',
  'Insurance',
  'Banking',
  'Investment',
  'Software Development',
  'E-commerce',
  'Logistics',
  'Mining',
  'Oil & Gas',
  'Renewable Energy',
  'Utilities',
  'Publishing',
  'Advertising',
  'Architecture',
  'Design',
  'Security Services',
  'Cleaning Services',
  'Personal Services',
  'Art & Culture',
  'Research & Development'
];

// GET /api/industries - Get all industries
router.get('/', (req, res) => {
  try {
    const sortedIndustries = industries.sort();
    
    res.status(200).json({
      success: true,
      message: 'Industries retrieved successfully',
      data: {
        industries: sortedIndustries,
        total: sortedIndustries.length
      }
    });
  } catch (error) {
    console.error('Error retrieving industries:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving industries',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/industries/search?q=query - Search industries
router.get('/search', (req, res) => {
  try {
    const query = req.query.q;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const filteredIndustries = industries.filter(industry =>
      industry.toLowerCase().includes(query.toLowerCase())
    ).sort();

    res.status(200).json({
      success: true,
      message: `Industries matching "${query}" retrieved successfully`,
      data: {
        industries: filteredIndustries,
        total: filteredIndustries.length,
        searchQuery: query
      }
    });
  } catch (error) {
    console.error('Error searching industries:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while searching industries',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
