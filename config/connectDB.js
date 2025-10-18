import mongoose from "mongoose";
let cachedDBConnection = null;
const connectDB = async () => {
  if (cachedDBConnection) {
    return cachedDBConnection;
  }
  try {
    const connection = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`Connected to database: ${connection.connection.name}`);
    cachedDBConnection = connection;
    return connection;
  } catch (error) {
    console.log(`Error: ${error}`);
    process.exit(1);
  }
};

export default connectDB;
