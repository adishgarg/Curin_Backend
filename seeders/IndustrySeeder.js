const mongoose = require('mongoose');
const Industry = require('../models/Industries');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Sample industry data based on the Industry schema
const industryData = [
  {
    IndustryName: "Technology Solutions Inc.",
    Location: "San Francisco, CA",
    ContactPoint: [
      {
        Name: "John Smith",
        Email: "john.smith@techsolutions.com",
        Phone: "+1-555-0101"
      },
      {
        Name: "Sarah Johnson",
        Email: "sarah.johnson@techsolutions.com",
        Phone: "+1-555-0102"
      }
    ]
  },
  {
    IndustryName: "Green Energy Corp",
    Location: "Austin, TX",
    ContactPoint: [
      {
        Name: "Michael Brown",
        Email: "michael.brown@greenenergy.com",
        Phone: "+1-555-0201"
      }
    ]
  },
  {
    IndustryName: "Healthcare Innovations",
    Location: "Boston, MA",
    ContactPoint: [
      {
        Name: "Dr. Emily Davis",
        Email: "emily.davis@healthinnovations.com",
        Phone: "+1-555-0301"
      },
      {
        Name: "Robert Wilson",
        Email: "robert.wilson@healthinnovations.com",
        Phone: "+1-555-0302"
      }
    ]
  },
  {
    IndustryName: "Financial Services LLC",
    Location: "New York, NY",
    ContactPoint: [
      {
        Name: "Jessica Miller",
        Email: "jessica.miller@finservices.com",
        Phone: "+1-555-0401"
      }
    ]
  },
  {
    IndustryName: "Manufacturing Excellence",
    Location: "Detroit, MI",
    ContactPoint: [
      {
        Name: "David Garcia",
        Email: "david.garcia@manufacturing.com",
        Phone: "+1-555-0501"
      },
      {
        Name: "Lisa Anderson",
        Email: "lisa.anderson@manufacturing.com",
        Phone: "+1-555-0502"
      }
    ]
  },
  {
    IndustryName: "Retail Dynamics",
    Location: "Los Angeles, CA",
    ContactPoint: [
      {
        Name: "Christopher Taylor",
        Email: "chris.taylor@retaildynamics.com",
        Phone: "+1-555-0601"
      }
    ]
  },
  {
    IndustryName: "Educational Technologies",
    Location: "Seattle, WA",
    ContactPoint: [
      {
        Name: "Amanda White",
        Email: "amanda.white@edutech.com",
        Phone: "+1-555-0701"
      },
      {
        Name: "Kevin Martinez",
        Email: "kevin.martinez@edutech.com",
        Phone: "+1-555-0702"
      }
    ]
  },
  {
    IndustryName: "Transportation Logistics",
    Location: "Chicago, IL",
    ContactPoint: [
      {
        Name: "Michelle Rodriguez",
        Email: "michelle.rodriguez@translogistics.com",
        Phone: "+1-555-0801"
      }
    ]
  },
  {
    IndustryName: "Food & Beverage Co.",
    Location: "Denver, CO",
    ContactPoint: [
      {
        Name: "Thomas Lee",
        Email: "thomas.lee@foodbeverage.com",
        Phone: "+1-555-0901"
      },
      {
        Name: "Jennifer Clark",
        Email: "jennifer.clark@foodbeverage.com",
        Phone: "+1-555-0902"
      }
    ]
  },
  {
    IndustryName: "Real Estate Ventures",
    Location: "Miami, FL",
    ContactPoint: [
      {
        Name: "Daniel Lewis",
        Email: "daniel.lewis@realestateventures.com",
        Phone: "+1-555-1001"
      }
    ]
  }
];

// Seed function
const seedIndustries = async () => {
  try {
    await connectDB();
    
    // Clear existing industries
    await Industry.deleteMany({});
    console.log('Cleared existing industries');
    
    // Insert new industries
    const createdIndustries = await Industry.insertMany(industryData);
    console.log(`Successfully seeded ${createdIndustries.length} industries:`);
    
    createdIndustries.forEach((industry, index) => {
      console.log(`${index + 1}. ${industry.IndustryName} - ${industry.Location} (${industry.ContactPoint.length} contacts)`);
    });
    
  } catch (error) {
    console.error('Error seeding industries:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the seeder
if (require.main === module) {
  seedIndustries();
}

module.exports = seedIndustries;
