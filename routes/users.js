const express = require("express");
const router = express.Router();
const pool= require('../config/db');
const bcrypt = require("bcrypt");
const passport = require("passport");

// passport inicializácie
const initPassport = require("../config/passportUsers");
initPassport(passport);
router.use(passport.initialize());
router.use(passport.session());

//logged in variable
router.get('*',function (req,res,next){
    res.locals.user = req.user || null;
    next();
})

router.get('/',checkAuth,function(req,res){
    res.render('index');
});
router.get('/login',checkAuth,function(req,res){
    res.render('login');
});
router.get('/register',checkAuth,function(req,res){
    res.render('register');
});

//žiadosť o registráciu
router.post('/register', async(req,res) =>{
    const email = req.body.email;
    const pass = req.body.heslo;
    const name= req.body.meno;
    const encryptedPass = await bcrypt.hash(pass, 10);
    try {
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
                req.flash("success", 'úspešne zaregistrovaný!');
            } catch (e) {
                req.flash("danger", "Registráciu sa nepodarilo vykonať")
                console.log(e);
            }
            res.render("login");
        } else {
            // email already registered
            if (users.rows.length > 0) {
                console.log("email obsadeny")
                req.flash("danger", 'Email už je registrovaný!');
            }
            res.render("register");
        }
    }catch (e) {
        console.log(e);
        req.flash("danger", "Registráciu sa nepodarilo vykonať")
        res.render("register");
    }
});


//Prihlásenie
router.post("/login",checkAuth,
    passport.authenticate("local", {
        successRedirect: "/user",
        failureRedirect: "/login",
        failureFlash: true
    })
);

//odhlásenie
router.get("/logout",checkNotAuth, function (req, res){
    req.logout();
    req.flash("success",'úspešne odhlásený!');
    res.redirect("/login");
});


router.get('/user',checkNotAuth, function(req,res){
    res.render('user');
});

//kontrola usera
function checkAuth(req,res,next){
    if(req.isAuthenticated()){
        return res.redirect('/user');
    }
    next();
}
//kontrola prihlásenia
function checkNotAuth(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash("danger","Prístup zamietnutý, prosím prihlás sa!")
    res.redirect(303,"/login");
}


module.exports = router