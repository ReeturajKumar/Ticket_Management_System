
const mongoose = require('mongoose');
require('dotenv').config({ path: 'c:/Users/reetu/Desktop/Student/server/.env' });

// Define User Schema explicitly to avoid import issues
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String,
  isHead: Boolean,
  department: String
});
const User = mongoose.model('User', userSchema);

async function listUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const users = await User.find({}, 'name email role isHead department');
    console.log('Users found:', users);

    // Explicitly check for users that might look like department heads but have wrong roles
    const deptHeads = users.filter(u => u.isHead === true);
    console.log('Users marked as isHead:', deptHeads);

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

listUsers();
