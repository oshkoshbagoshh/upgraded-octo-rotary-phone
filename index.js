const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const dataPath = path.join(__dirname, 'data.json');

// Helper function to read data
async function readData() {
  try {
    const data = await fs.readFile(dataPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading data:", error);
    return { users: [], exercises: [] };
  }
}

// Helper function to write data
async function writeData(data) {
  try {
    await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error writing data:", error);
  }
}

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Create a new user
app.post('/api/users', async (req, res) => {
  try {
    const data = await readData();
    const newUser = {
      username: req.body.username,
      _id: Date.now().toString()
    };
    data.users.push(newUser);
    await writeData(data);
    res.json(newUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const data = await readData();
    res.json(data.users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add exercise for a user
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const data = await readData();
    const user = data.users.find(u => u._id === req.params._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { description, duration, date } = req.body;
    const newExercise = {
      username: user.username,
      description,
      duration: parseInt(duration),
      date: date ? new Date(date).toDateString() : new Date().toDateString(),
      _id: user._id
    };
    data.exercises.push(newExercise);
    await writeData(data);

    res.json(newExercise);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get exercise log for a user
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const data = await readData();
    const user = data.users.find(u => u._id === req.params._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let { from, to, limit } = req.query;
    let exercises = data.exercises.filter(e => e._id === user._id);

    if (from) {
      exercises = exercises.filter(e => new Date(e.date) >= new Date(from));
    }
    if (to) {
      exercises = exercises.filter(e => new Date(e.date) <= new Date(to));
    }
    if (limit) {
      exercises = exercises.slice(0, parseInt(limit));
    }

    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log: exercises.map(({ description, duration, date }) => ({ description, duration, date }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
