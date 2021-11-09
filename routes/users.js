const express = require("express");
const router = express.Router();
const pool= require('../config/db');
const bcrypt = require("bcrypt");

router.get('/',function(req,res){
    res.render('index');
});
router.get('/login',function(req,res){
    res.render('login');
});
router.get('/register',function(req,res){
    res.render('register');
});

//žiadosť o registráciu
router.post('/register', async(req,res) =>{
    const email = req.body.email;
    const pass = req.body.heslo;
    const name= req.body.meno;
    const encryptedPass = await bcrypt.hash(pass, 10);

    const users = await pool.query(
        'SELECT * FROM users where email=$1',
        [email]
    )
    if (users.rows.length === 0) {
        // no email registered - allow registration
        try {
            pool.query(
                'INSERT INTO users (name, email, password, team) VALUES ($1,$2,$3,$4);',
                [name, email, encryptedPass, null]
            )
            console.log("zaregistrovany");
        } catch (e) {
            //req.flash("danger", "Registráciu sa nepodarilo vykonať")
            console.log("insert err");
        }

        //req.flash("success", 'úspešne zaregistrovaný!');
        res.render("login");
    } else {
        // email already registered
        if (users.rows.length > 0) {
            console.log("email obsadeny")
            //req.flash("danger", 'Email už je registrovaný!');
        }
        res.render("register");
    }
});


module.exports = router