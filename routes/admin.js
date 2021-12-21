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


router.get("/admin/register", checkAdminExists, function (req, res){
    res.render('admin/register');
});


//žiadosť o registráciu
router.post('/admin/register', checkAdminExists, async(req,res) =>{
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
                    [name, email, encryptedPass, null, "admin"]
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
            res.render("admin/register");
        }
    }catch (e) {
        console.log(e);
        req.flash("danger", "Registráciu sa nepodarilo vykonať")
        res.render("admin/register");
    }
});

router.get("/settings", checkNotAuthAdmin, async function(req, res) {
    res.render("admin/settings")
})

router.get("/addleague", checkNotAuthAdmin, async function (req, res){
    try{
        const leagues = await pool.query('SELECT * FROM leagues');
        res.render('admin/addleague', {
            leagues: leagues.rows
        });
    }catch (e) {
        console.log(e);
        req.flash("danger", 'Chyba pri hľadaní súťaží');
        res.redirect("/user");
    }
});

//Požiadavka na zmenu údajov
router.post('/addleague', checkNotAuthAdmin, async (req,res)=>{
    console.log(req.body.leagueopen);
    if(!req.body.startdatefirst || !req.body.startdatesecond || !req.body.nteams ){
        req.flash("danger", "Operácia neúspešná! neboli zadané potrebné údaje!");
        res.status(401).redirect("/settings");
    }
    let open = false;
    if(req.body.leagueopen){
        open = true;
    }
    const sql="INSERT INTO leagues (name, start_date_first, start_date_second, nteams, opened) VALUES ($1,$2,$3,$4,$5);";
    pool.query(
        sql,[req.body.leaguename,req.body.startdatefirst, req.body.startdatesecond, req.body.nteams, open],
        (err) => {
            console.log(err);
            if(err){
                req.flash("danger",'Nastala chyba!');
                res.redirect("/");
            }
        });
    req.flash("success",'Súťaž bola pridaná!');
    res.redirect("/settings");

});

//kontrola usera
function checkAuth(req,res,next){
    if(req.isAuthenticated()){
        return res.redirect('/user');
    }
    next();
}
//kontrola prihlásenia
function checkNotAuthAdmin(req, res, next) {
    if (req.isAuthenticated()) {
        if(req.user.privileges === "admin"){
            return next();
        }
    }
    req.flash("danger","Prístup zamietnutý, nedostatočné oprávnenie!")
    res.redirect(303,"/");
}

function checkAdminExists(req, res, next) {
    pool.query('SELECT * FROM users where privileges=$1',["admin"],
        (err,result)=>{
        if(err){
            throw err;
        }
        else {
            if(result.rows.length===0){
                return next();
            }
            else{
                req.flash("danger","Prístup zamietnutý, administrátor už existuje!")
                res.redirect(303,"/");
            }
        }
    })
}


module.exports = router