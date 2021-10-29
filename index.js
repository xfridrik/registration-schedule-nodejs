const express = require('express');
const app = express();

//server start
app.listen(process.env.PORT||3000,function(){
    console.log('Server is running...');
})