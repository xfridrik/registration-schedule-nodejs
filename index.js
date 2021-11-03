const express = require('express');
const app = express();

// set view engine - pug
application.set('views', path.join(__dirname,'views'));
application.set('view engine', 'pug');

// server start
app.listen(process.env.PORT||3000,function(){
    console.log('Server is running...');
})