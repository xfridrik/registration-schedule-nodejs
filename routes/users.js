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

router.get('/schedule',checkNotAuth, function(req,res){
    res.render('schedule');
});

router.get('/user',checkNotAuth, function(req,res){
    res.render('user',{
        name:req.user.name,
    });
});

router.get('/team',checkNotAuth, function(req,res){
    if(req.user.team){
        pool.query("SELECT * FROM teams where id = $1",[req.user.team],(err,result)=>{
            if(err){
                req.flash("danger", 'Nepodarilo sa nájsť tím!');
                res.redirect("/user");
            }
            else {
                if(result.rows.length>0){
                    res.render("team",{
                        team:req.user.team,
                        name:result.rows[0].name,
                        pref:result.rows[0].preferred_match
                    });
                }
                else{
                    req.flash("danger", 'Nepodarilo sa nájsť tím!');
                    res.redirect("/user");
                }
            }
        });
    }
    else{
        res.render('team',{
            team:req.user.team,
        });
    }
});

router.post('/add', async(req,res) =>{
    //kontrola zadania potrebných údajov na query
    if(!req.body.nazov){
        req.flash("danger", "Operácia neúspešná! neboli zadané potrebné údaje!");
        res.status(401).redirect("/team");
    }
    else if(req.user.team){
        req.flash("danger", "Operácia neúspešná! Užívateľ už má priradený tím!");
        res.status(200).redirect("/team");
    }
    else{
        const name = req.body.nazov;
        const preferred_match = req.body.zapas || 0;

        const sql = "INSERT INTO teams (name, preferred_match) VALUES ($1,$2) RETURNING *;";
        const sqlCheck = "SELECT * from teams where name = $1";
        const todo = await pool.query(sqlCheck,[name]);
        //DANY TIM UZ EXISTUJE
        if (todo.rows.length > 0) {
            req.flash("danger", 'Tím s rovnakým názvom už existuje!');
            res.redirect("/team");
        } else {
            pool.query(
                sql, [name, preferred_match],
                (err, res) => {
                    console.log(err, res);
                    if(err){
                        req.flash("danger", 'Nepodarilo sa registrovať tím!');
                        res.redirect("/team");
                    }
                    else{
                        pool.query("UPDATE users SET team=$1 where id = $2;",[res.rows[0].id,req.user.id],(err,res)=>{
                            if(err){
                                req.flash("danger", 'Nepodarilo sa priradiť tím!');
                                res.redirect("/team");
                            }
                        });
                    }
                });

            req.flash("success", 'Tím bol pridaný!');
            res.redirect("/user");
        }
    }
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