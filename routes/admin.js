const express = require("express");
const router = express.Router();
const pool= require('../config/db');
const passport = require('passport');

const adminController = require('../controllers/adminController')
const leagueController = require('../controllers/leagueController')

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

router.get('/admin/register', checkAdminExists, function (req, res){
    res.render('admin/register');
});

router.post('/admin/register', checkAdminExists, adminController.adminRegister);


router.get("/settings", checkNotAuthAdmin, adminController.adminShowSettings);

router.get("/addleague", checkNotAuthAdmin, (req, res) => {
    res.render('admin/addleague');
});

router.get("/league", checkNotAuthAdmin, leagueController.showLeague)

router.post('/updateleague', checkNotAuthAdmin, leagueController.updateLeague);

router.post('/addleague', checkNotAuthAdmin, leagueController.addLeague);

router.post('/generateschedule', checkNotAuthAdmin, leagueController.leagueGenerateSchedule);


// Kontrola administrátora
function checkNotAuthAdmin(req, res, next) {
    if (req.isAuthenticated()) {
        if(req.user.privileges === "admin"){
            return next();
        }
    }
    req.flash("danger","Prístup zamietnutý, nedostatočné oprávnenie!")
    res.redirect(303,"/");
}

async function checkAdminExists(req, res, next) {
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