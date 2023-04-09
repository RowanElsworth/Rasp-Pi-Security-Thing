const bcrypt = require('bcrypt');
const { ObjectId } = require('mongodb');
const { connectToDatabase, closeDatabaseConnection } = require('./db');

// Function to check if the provided username and password are valid
async function authenticateUser(username, password) {
  try {
    const client = await connectToDatabase();
    const collection = client.db('security-db').collection('users');
    const user = await collection.findOne({ username });
    if (!user) {
      // User not found
      closeDatabaseConnection();
      return null;
    }

    // Compare provided password with stored hashed password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      // Password does not match
      closeDatabaseConnection();
      return null;
    }

    // Return the user object without the password field
    delete user.password;
    closeDatabaseConnection();
    return user;
  } catch (error) {
    console.error('Error authenticating user:', error);
    closeDatabaseConnection();
    throw new Error('An error occurred while authenticating user.');
  }
}

module.exports = { authenticateUser };
