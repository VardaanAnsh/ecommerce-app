require('dotenv').config();
const express = require('express'); 
const app = express();
const cookieParser = require('cookie-parser');
const path = require('path');
const expressSession = require('express-session');
const flash = require('connect-flash');

// Routers
const ownersRouter = require("./routes/ownersRouter");
const usersRouter = require("./routes/usersRouter");
const productsRouter = require("./routes/productsRouter");
const addressesRouter = require('./routes/addressesRouter');
const indexpage = require("./routes/index");

// MongoDB connection
const db = require('./config/mongoose-connection');

// Middleware setup
app.use(express.json());    
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true })); 
app.use(cookieParser());

// Session and flash setup
app.use(
  expressSession({
    secret: process.env.EXPRESS_SESSION_SECRET, // ✅ USE THE ACTUAL ENV VARIABLE
    resave: false,
    saveUninitialized: false,
    
  })
);

app.use(flash());

// Make flash messages available to all views
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

// Set EJS view engine
app.set('view engine', 'ejs');

// Route mounts
app.use('/', indexpage);
app.use('/owners', ownersRouter);
app.use('/users', usersRouter);
app.use('/products', productsRouter);
app.use('/addresses', addressesRouter);

// Start server
app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
