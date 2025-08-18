const mongoose = require('mongoose');
const Employee = require('../models/Employee');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected for seeding');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

// Sample employee data - only using fields from the actual schema
const employeesData = [
  {
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@curin.com',
    phone: '+1234567890',
    designation: 'Senior Software Engineer'
  },
  {
    firstName: 'Alice',
    lastName: 'Johnson',
    email: 'alice.johnson@curin.com',
    phone: '+1234567892',
    designation: 'Frontend Developer'
  },
  {
    firstName: 'Michael',
    lastName: 'Brown',
    email: 'michael.brown@curin.com',
    phone: '+1234567894',
    designation: 'Engineering Manager'
  },
  {
    firstName: 'Sarah',
    lastName: 'Davis',
    email: 'sarah.davis@curin.com',
    phone: '+1234567896',
    designation: 'Product Manager'
  },
  {
    firstName: 'David',
    lastName: 'Wilson',
    email: 'david.wilson@curin.com',
    phone: '+1234567898',
    designation: 'UI/UX Designer'
  },
  {
    firstName: 'Emily',
    lastName: 'Taylor',
    email: 'emily.taylor@curin.com',
    phone: '+1234567800',
    designation: 'Marketing Specialist'
  },
  {
    firstName: 'Robert',
    lastName: 'Anderson',
    email: 'robert.anderson@curin.com',
    phone: '+1234567802',
    designation: 'Sales Representative'
  },
  {
    firstName: 'Jennifer',
    lastName: 'Martinez',
    email: 'jennifer.martinez@curin.com',
    phone: '+1234567804',
    designation: 'HR Manager'
  },
  {
    firstName: 'Christopher',
    lastName: 'Garcia',
    email: 'christopher.garcia@curin.com',
    phone: '+1234567806',
    designation: 'Financial Analyst'
  },
  {
    firstName: 'Amanda',
    lastName: 'Rodriguez',
    email: 'amanda.rodriguez@curin.com',
    phone: '+1234567808',
    designation: 'Operations Manager'
  }
];

// Seed function
const seedEmployees = async () => {
  try {
    console.log('Starting employee seeding...');
    
    // Clear existing employees (optional - remove if you want to keep existing data)
    await Employee.deleteMany({});
    console.log('Cleared existing employees');
    
    // Insert new employees
    const createdEmployees = await Employee.insertMany(employeesData);
    console.log(`Successfully seeded ${createdEmployees.length} employees`);
    
    // Display created employees
    createdEmployees.forEach((emp, index) => {
      console.log(`${index + 1}. ${emp.fullName} - ${emp.designation}`);
    });
    
  } catch (error) {
    console.error('Error seeding employees:', error);
  }
};

// Main function
const main = async () => {
  await connectDB();
  await seedEmployees();
  
  console.log('\nSeeding completed! Closing database connection...');
  await mongoose.connection.close();
  process.exit(0);
};

// Run the seeder
if (require.main === module) {
  main();
}

module.exports = { seedEmployees, employeesData };
