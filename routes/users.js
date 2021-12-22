const express = require("express");
const router = express.Router();
const pool= require('../config/db');
const bcrypt = require("bcrypt");
const passport = require('passport');

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
                    'INSERT INTO users (name, email, password, team, privileges) VALUES ($1,$2,$3,$4,$5);',
                    [name, email, encryptedPass, null, "user"]
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

router.get('/user',checkNotAuth, async function(req,res){
    try{
        const leagues = await pool.query('SELECT * FROM leagues');
        console.log(leagues)
        res.render('user',{
            name:req.user.name,
            leagues:leagues.rows
        });
    }
    catch (e) {
        req.flash("danger", 'Nastala chyba!');
        res.redirect("/");
    }
});

router.get('/team',checkNotAuth, async function(req,res){
    if(req.user.team){
        pool.query("SELECT * FROM teams where id = $1",[req.user.team],(err,result)=>{
            if(err){
                req.flash("danger", 'Nepodarilo sa zobraziť tím!');
                res.redirect("/user");
            }
            else {
                if(result.rows.length>0){
                    pool.query('SELECT * FROM leagues',(err,result2)=>{
                        if(err){
                            req.flash("danger", 'Nastala chyba!');
                            res.redirect("/user");
                        }else{
                            res.render("team",{
                                team:result.rows[0],
                                leagues:result2.rows
                            });
                        }
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
        try{
            const leagues = await pool.query('SELECT * FROM leagues');
            console.log(leagues)
            res.render('team',{
                team:req.user.team,
                leagues:leagues.rows,
            });
        }
        catch (e) {
            req.flash("danger", 'Nastala chyba!');
            res.redirect("/");
        }

    }
});

router.post('/add', checkNotAuth, async(req,res) =>{
    //kontrola zadania potrebných údajov na query
    if(!req.body.nazov || !req.body.league){
        req.flash("danger", "Operácia neúspešná! neboli zadané potrebné údaje!");
        res.status(401).redirect("/team");
    }
    else if(req.user.team){
        req.flash("danger", "Operácia neúspešná! Užívateľ už má priradený tím!");
        res.status(200).redirect("/team");
    }
    else{
        const name = req.body.nazov;
        const league = req.body.league;
        const preferred_match = req.body.prefmatch || 0;

        const sql = "INSERT INTO teams (name, preferred_match, league) VALUES ($1,$2,$3) RETURNING *;";
        const sqlCheck = "SELECT * from teams where name = $1";
        const sqlCheck2 = "SELECT * from leagues where id = $1";

        const todo = await pool.query(sqlCheck,[name]);
        const leagues = await pool.query(sqlCheck2,[league]);

        if (todo.rows.length > 0) { // tim uz existuje
            req.flash("danger", 'Tím s rovnakým názvom už existuje!');
            res.redirect("/team");

        }else if(leagues.rows.length !== 1) { // sutaz neexistuje
            req.flash("danger", 'Zadaná súťaž nebola nájdená!');
            res.redirect("/team");

        }else if(!leagues.rows[0].opened){
            req.flash("danger", 'Prihlasovanie do súťaže bolo ukončené!');
            res.redirect("/team");

        }else { // pridá tím do db
            pool.query(
                sql, [name, preferred_match, league],
                (err, result) => {
                    console.log(err, result);
                    if(err){
                        req.flash("danger", 'Nepodarilo sa registrovať tím!');
                        res.redirect("/team");

                    } else{ //pridá tím užívateľovi
                        pool.query("UPDATE users SET team=$1 where id = $2;",[result.rows[0].id,req.user.id],(err,result)=>{
                            if(err){
                                req.flash("danger", 'Nepodarilo sa priradiť tím!');
                                res.redirect("/team");

                            }else {
                                req.flash("success", 'Tím bol pridaný!');
                                res.redirect("/user");
                            }
                        });
                    }
                });
        }
    }
});

//Požiadavka na zmenu údajov
router.post('/update', checkNotAuth, async (req,res)=>{
    if(!(req.body.nazov)){
        req.flash("danger", "Operácia neúspešná! neboli zadané potrebné údaje!");
        res.redirect("/team");
    }
    const name = req.body.nazov;
    const preferred_match = req.body.prefmatch || 0;
    //Ak nastala zmena názvu, skontroluje, či už taký tím neexistuje
    if(name!==req.body.pred){
        const sqlCheck="SELECT * from teams where name = $1";
        const todo=await pool.query(sqlCheck,[name]);
        if(todo.rows.length>0){
            req.flash("danger",'Tím s rovnakým názvom už existuje!');
            res.redirect("/team")
            return;
        }
    }
    const sql = "UPDATE teams SET name=$1, preferred_match=$2 where id = $3";
    pool.query(
        sql,[name,preferred_match,req.user.team],
        (err) => {
            console.log(err);
            if(err){
                req.flash("danger",'Nastala chyba!');
                res.redirect("/");
            }
        });
    req.flash("success",'Údaje boli úspešne zmenené!');
    res.redirect("/team");
});

// remove team from user
router.post("/remove-team", checkNotAuth, function (req, res){
    pool.query("UPDATE users SET team=$1 where id = $2; DELETE FROM teams where id = $2 ",[null,req.user.id], (err)=> {
        if (err) {
            req.flash("danger", 'Nepodarilo sa odstrániť tím!');
            res.redirect("/team");

        } else {
            req.flash("success", 'Tím bol odstránený z účtu!');
            res.redirect("/user");
        }
    })
})

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
    req.flash("danger","Prístup bol zamietnutý!")
    res.redirect(303,"/");
}


module.exports = router