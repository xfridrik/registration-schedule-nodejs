const express = require('express');
const app = express();
const path = require('path');
let users = require('./routes/users');

// set view engine - pug
app.set('views', path.join(__dirname,'views'));
app.set('view engine', 'pug');

app.use('/',users);

// server start
app.listen(process.env.PORT||3000,function(){
    console.log('Server is running...');
})