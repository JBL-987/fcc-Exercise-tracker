const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

let bodyParser = require('body-parser');
let mongoose = require('mongoose');
mongoose.set('strictQuery', false);
const { ObjectId } = require('mongodb');

app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// Inisialisasi schema
const Schema = mongoose.Schema;

// Buat schema user
const userSchema = new Schema({
  // data username
  username: {
    type: String,
    required: true,
  },
});

// buat schema exercise
const exerciseSchema = new Schema({
  // data user
  user: {
    type: ObjectId,
    required: true,
  },
  // data description
  description: {
    type: String,
    required: true,
  },
  // data duration
  duration: {
    type: Number,
    required: true,
  },
  // data date
  date: {
    type: String,
    required: true,
  },
  // data unix
  unix: {
    type: Number,
    required: true,
  },

});

// inisialisasi model user dan exercise
let User = mongoose.model('users', userSchema);
let Exercise = mongoose.model('exersices', exerciseSchema);

// route /api/users
app.get('/api/users', async function(req, res) {
  // Mengambil data user
  let users = await User.find().exec();
  // Mengembalikan data user
  res.send(users);
})

app.post('/api/users', function(req, res) {
  // Mengambil body username
  let username = req.body.username;

  // Membuat user baru
  let newUser = new User({
    'username': username,
  })

  // Menyimpan data user baru ke database
  newUser.save()

  // Mengembalikan data user
  res.json({
    username: newUser.username,
    _id: newUser._id
  })
})

// route /api/users/:_id/exercises
app.post('/api/users/:_id/exercises', async function(req, res) {
  // Mengambil data dari param dan body
  let id = req.params._id;
  let description = req.body.description;
  let duration = req.body.duration;
  let date = req.body.date;
  let unix, newExercise;

  // Pengecekan date (membuat date saat ini jika date tidak dikirimkan dari client)
  if (!date) {
    date = new Date().toDateString()
    unix = new Date().getTime();
  } else {
    unix = new Date().getTime();
    date = new Date(date).toDateString()
  }

  // Menambil data user
  let user = await User.findById(id);

  // Mengembalikan error jika data user tidak ditemukan
  if (!user) {
    return res.json({
      error: "Invalid User"
    });
  }

  try {
    // Membuat exercise baru
    let newExerciseObj = new Exercise({
      user: new ObjectId(id),
      date: date,
      unix: unix,
      duration: duration,
      description: description,
    });

    // Menyimpkan exercise baru
    newExercise = await newExerciseObj.save();
  } catch (e) {
    console.error(e);
  }

  // Mengembalikan data user dengan data exercise terkait
  return res.send({
    _id: user._id,
    username: user.username,
    date: newExercise.date,
    duration: newExercise.duration,
    description: newExercise.description
  });
})

// route /api/users/:_id/logs
app.get('/api/users/:_id/logs', async function(req, res) {
  // Mengambil data param query
  let id = req.params._id;
  let from = req.query.from;
  let to = req.query.to;
  let limit = Number(req.query.limit);
  let from_miliseconds, to_miliseconds, count, exercises;

  // Mengambil data user dari database
  let user = await User.findById({ _id: id }).exec();

  // Mengembalikan error jika data user tidak ditemukan
  if (!user) {
    res.json({
      error: 'User is not registered'
    })
  }

  // Pengecekan bila query from dan to diberikan
  if (from && to) {
    from_miliseconds = new Date(from).getTime() - 1; // -1 karena biar jadi dari, bukan lebih besar
    to_miliseconds = new Date(to).getTime() - 1; // -1 karena biar jadi sebelum, bukan lebih kecil

    // Mengambil jumlah exercise
    count = await Exercise.find({ user: id, unix: { $gt: from_miliseconds, $lt: to_miliseconds } }).countDocuments();

    // Jika tidak dikirimkan limit, maka limit akan berisi count dokumennya
    if (!limit) {
      limit = count;
    }

    // Mengambil data exercise sesuai dengan data-data terkait
    exercises = await Exercise
      .find({ user: id, unix: { $gt: from_miliseconds, $lt: to_miliseconds } })
      .select({
        _id: 0,
        description: 1,
        duration: 1,
        date: 1,
      })
      .limit(limit)
      .exec();
  }

  // Pengecekan bila hanya query from diberikan
  else if (from) {
    from_miliseconds = new Date(from).getTime();

    // Mengambil jumlah exercise
    count = await Exercise.find({ user: id, unix: { $gt: from_miliseconds } }).countDocuments();

    // Jika tidak dikirimkan limit, maka limit akan berisi count dokumennya
    if (!limit) {
      limit = count;
    }

    // Mengambil data exercise sesuai dengan data-data terkait
    exercises = await Exercise
      .find({ user: id, unix: { $gt: from_miliseconds } })
      .select({
        _id: 0,
        description: 1,
        duration: 1,
        date: 1,
      })
      .limit(limit)
      .exec();
  }

  // Pengecekan bila hanya to diberikan
  else if (to) {
    to_miliseconds = new Date(to).getTime();

    count = await Exercise.find({ user: id, unix: { $lt: to_miliseconds } }).countDocuments();

    // Jika tidak dikirimkan limit, maka limit akan berisi count dokumennya
    if (!limit) {
      limit = count;
    }

    // Mengambil data exercise sesuai dengan data-data terkait
    exercises = await Exercise
      .find({ user: id, unix: { $lt: to_miliseconds } })
      .select({
        _id: 0,
        description: 1,
        duration: 1,
        date: 1,
      })
      .limit(limit)
      .exec();
  }

  // Mengambil jumlah exercise jika from dan to tidak diberikan
  count = await Exercise.find({ user: id }).countDocuments();

  // Jika tidak dikirimkan limit, maka limit akan berisi count dokumennya
  if (!limit) {
    limit = count;
  }

  // Mengambil data exercise sesuai dengan data-data terkait
  exercises = await Exercise
    .find({ user: id })
    .select({
      _id: 0,
      description: 1,
      duration: 1,
      date: 1,
    })
    .limit(limit)
    .exec();

  // Mengembalikan data user dengan exercises
  return res.send({
    username: user.username,
    count: count,
    _id: user._id,
    log: exercises
  });

})

const start = async () => {
  try {
    let port = 3000;
    // menghubungkan ke database
    await mongoose.connect(process.env.MONGO_URI);

    app.listen(port, function() {
      console.log(`Listening on port ${port}`);
    });
  } catch (e) {
    console.log(e.message)
  }
}

start();