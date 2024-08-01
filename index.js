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
  const data = await fs.readFile(dataPath, 'utf8');
  return JSON.parse(data);
}

// Helper function to write data
async function writeData(data) {
  await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
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
    res.status(500).json({ error: err.message });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const data = await readData();
    res.json(data.users);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
      description,
      duration: parseInt(duration),
      date: date ? new Date(date).toDateString() : new Date().toDateString(),
    };

    // Add the exercise to the user's exercises array
    if (!user.log) {
      user.log = [];
    }
    user.log.push(newExercise);

    // Update the user in the data
    const userIndex = data.users.findIndex(u => u._id === req.params._id);
    data.users[userIndex] = user;

    await writeData(data);

    // Return the user object with the exercise fields added
    res.json({
      _id: user._id,
      username: user.username,
      date: newExercise.date,
      duration: newExercise.duration,
      description: newExercise.description
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    let exercises = user.log || [];

    if (from) {
      exercises = exercises.filter(e => new Date(e.date) >= new Date(from));
    }
    if (to) {
      exercises = exercises.filter(e => new Date(e.date) <= new Date(to));
    }
    if (limit) {
      exercises = exercises.slice(0, parseInt(limit));
    }

    // Ensure date is in the correct string format
    exercises = exercises.map(e => ({
      ...e,
      date: new Date(e.date).toDateString()
    }));

    res.json({
      _id: user._id,
      username: user.username,
      count: exercises.length,
      log: exercises
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Your app is listening on port ${port}`);
});