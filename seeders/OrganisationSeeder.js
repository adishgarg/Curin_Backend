const mongoose = require('mongoose');
const Organization = require('../models/Organisation');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected for seeding...');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Sample organization data
const organizationsData = [
  {
    OrganizationName: "TechCorp Solutions",
    Location: "San Francisco, CA"
  },
  {
    OrganizationName: "Global Finance Group",
    Location: "New York, NY"
  },
  {
    OrganizationName: "Healthcare Innovations Ltd",
    Location: "Boston, MA"
  },
  {
    OrganizationName: "Green Energy Partners",
    Location: "Austin, TX"
  },
  {
    OrganizationName: "Digital Marketing Agency",
    Location: "Los Angeles, CA"
  }
];

// Seed organizations
const seedOrganizations = async () => {
  try {
    // Clear existing organizations
    await Organization.deleteMany({});
    console.log('Cleared existing organizations...');

    // Insert new organizations
    const organizations = await Organization.insertMany(organizationsData);
    console.log(`Successfully seeded ${organizations.length} organizations:`);
    
    organizations.forEach((org, index) => {
      console.log(`${index + 1}. ${org.OrganizationName} - ${org.Location}`);
    });

  } catch (error) {
    console.error('Error seeding organizations:', error);
  }
};

// Main seeding function
const runSeeder = async () => {
  await connectDB();
  await seedOrganizations();
  mongoose.connection.close();
  console.log('Database connection closed.');
};

// Run seeder if called directly
if (require.main === module) {
  runSeeder();
}

module.exports = { seedOrganizations, runSeeder };
