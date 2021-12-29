const express = require('express');
const app = express();
const path = require('path');
let users = require('./routes/users');
let admin = require('./routes/admin');

// set view engine - pug
app.set('views', path.join(__dirname,'views'));
app.set('view engine', 'pug');

// add public folder
app.use(express.static(__dirname + '/public'));

// parse data from web
app.use(express.urlencoded({ extended: false }));

//Session middleware

const session=require('express-session');
app.use(session({
    secret: 'red cat 123',
    resave: false,
    saveUninitialized: true,
}));


//messages middleware
app.use(require('connect-flash')());
app.use(function (req,res,next){
    res.locals.messages = require('express-messages')(req,res);
    next();
});



app.use('/',users);
app.use('/',admin);

// server start
app.listen(process.env.PORT||3000,function(){
    console.log('Server is running...');
})