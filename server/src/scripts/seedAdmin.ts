import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import path from 'path';
import User from '../models/User';
import { UserRole } from '../constants/index';
import { hashPassword } from '../utils/security';
import connectDB from '../config/db';

console.log("Environment loaded.");

const seedAdmin = async () => {
  try {
    console.log("Connecting to DB...");
    await connectDB();
    console.log("Connected to DB.");
    
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@cloudblitz.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
    
    // Check if admin exists
    const existingAdmin = await User.findOne({ 
      $or: [
        { role: UserRole.ADMIN },
        { email: adminEmail }
      ]
    });
    
    if (existingAdmin) {
      console.log(`Admin user already exists with email: ${existingAdmin.email}`);
      process.exit(0);
    }
    
    // Create new admin
    const hashedPassword = await hashPassword(adminPassword);
    
    const adminUser = await User.create({
      name: 'Super Admin',
      email: adminEmail,
      password: hashedPassword,
      role: UserRole.ADMIN,
      isApproved: true,
      approvalStatus: 'APPROVED'
    });
    
    console.log(`\n✅ Admin user created successfully!`);
    console.log(`Email: ${adminUser.email}`);
    console.log(`Password: ${adminPassword}`);
    console.log(`Role: ${adminUser.role}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin user:', error);
    process.exit(1);
  }
};

seedAdmin();
