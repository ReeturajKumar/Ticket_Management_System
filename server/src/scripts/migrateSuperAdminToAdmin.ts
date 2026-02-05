import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import User from '../models/User';
import { UserRole } from '../constants/index';
import connectDB from '../config/db';

console.log("Starting SUPER_ADMIN to ADMIN migration...");

const migrateSuperAdminToAdmin = async () => {
  try {
    console.log("Connecting to DB...");
    await connectDB();
    console.log("Connected to DB.");
    
    // Find all users with SUPER_ADMIN role
    const superAdminUsers = await User.find({ role: 'SUPER_ADMIN' });
    
    if (superAdminUsers.length === 0) {
      console.log('No SUPER_ADMIN users found. Migration not needed.');
      process.exit(0);
    }
    
    console.log(`Found ${superAdminUsers.length} SUPER_ADMIN user(s) to migrate.`);
    
    // Update all SUPER_ADMIN users to ADMIN
    const result = await User.updateMany(
      { role: 'SUPER_ADMIN' },
      { $set: { role: UserRole.ADMIN } }
    );
    
    console.log(`✅ Successfully migrated ${result.modifiedCount} user(s) from SUPER_ADMIN to ADMIN role.`);
    
    // List the migrated users
    const migratedUsers = await User.find({ 
      _id: { $in: superAdminUsers.map(u => u._id) } 
    }).select('name email role');
    
    console.log('\nMigrated users:');
    migratedUsers.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - Role: ${user.role}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
};

migrateSuperAdminToAdmin();