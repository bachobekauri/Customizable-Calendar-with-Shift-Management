const express = require('express');
const cors = require('cors'); // allow React frontend to call backend

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Test endpoint
app.get('/api/message', (req, res) => {
  res.json({ message: 'Hello from Express!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
