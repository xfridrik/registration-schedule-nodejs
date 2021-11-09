const express = require("express");
const router = express.Router();
const {pool,settings}= require('../config/db');

router.get('/',function(req,res){
    res.render('index');
});
router.get('/login',function(req,res){
    res.render('login');
});
router.get('/register',function(req,res){
    res.render('register');
});

router.post('/register',function(req,res){
    res.render('register');
});

module.exports = router