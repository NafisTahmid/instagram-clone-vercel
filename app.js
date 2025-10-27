import app from "./index.js";

// Ensure that the file is the entry point (similar to `require.main === module`)
if (import.meta.url === `file://${process.argv[1]}`) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running locally on http://localhost:${PORT}`);
  });
}

export default (req, res) => {
  app(req, res);
};
