if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const express = require('express');
const app = express();
const mongoose = require('mongoose');
const path = require('path');
const methodOverride = require('method-override');  // as form use get and post request can only be used but using methodoerride we can send request like put and deelte to the backend. 
const ejsMate = require('ejs-mate');
const ExpressError = require('./utils/ExpressError.js');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/user.js')


const listingsRouter = require('./routes/listing.js');
const reviewsRouter = require('./routes/review.js');
const userRouter = require('./routes/user.js');

// connection with database
// const MONGO_URL = 'mongodb://127.0.0.1:27017/project'
const dbUrl = process.env.ATLASDB_URL;

main()
    .then(() => { console.log("connected to database") })
    .catch(err => console.log(err));

async function main() {
    await mongoose.connect(dbUrl);
}

app.set('view engine', 'ejs');
app.set("views", path.join(__dirname, 'views'))

app.use(express.urlencoded({ extended: true }))   //express.urlencoded is a middleware  function to access the data inside the request
app.use(methodOverride("_method"))
app.use(express.static(path.join(__dirname, '/public')))  //express.static is a middleware function i ued to serve static files(like css file,j file,css image) of backend to serve to the front end side or client,

//Mongo store session info on mogoatlus
const store = MongoStore.create({
    mongoUrl: dbUrl,
    crypto: {
        secret: process.env.SECRET,
    },
    touchAfter: 24 * 60 * 60, // See below for details
});

store.on("error", () => {
    console.log("Error in MongoSession store");
})

const sessionOptions = {
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true, //cross scripting attacks
    }
};



app.use(session(sessionOptions));
app.use(flash());

//For passport setup
//Passport will use implementation of session it should be after session
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


//Middleware for flash
app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
});


//Restructuring all routes
app.use("/listings", listingsRouter);
app.use("/listings/:id/reviews", reviewsRouter);
app.use("/", userRouter);


// app.get('/', (req, res) => {
//     res.send("This is root page");
// })

app.all("*", (req, res, next) => {
    next(new ExpressError(404, "Page not Found"));
})

//Error handling 
app.use((err, req, res, next) => {
    let { statusCode = 500, message = "Something went wrong" } = err;
    res.status(statusCode).render("./listing/error.ejs", { err })
    // res.status(statusCode).send(message);
})

app.listen(3008, () => {
    console.log('listening on port 3008');
})