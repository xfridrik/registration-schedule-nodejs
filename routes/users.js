const express = require("express");
const router = express.Router();
const passport = require('passport');

const userController = require('../controllers/userController')

// passport inicializácie
const initPassport = require("../config/passportUsers");
initPassport(passport);
router.use(passport.initialize());
router.use(passport.session());

//logged in variable
router.get('*',function (req,res,next){
    res.locals.user = req.user || null;
    next();
});

router.post("/login",checkAuth,
    passport.authenticate("local", {
        successRedirect: "/user",
        failureRedirect: "/login",
        failureFlash: true
    })
);

router.get('/',checkAuth,function(req,res){
    res.render('index');
});

router.get('/login',checkAuth,function(req,res){
    res.render('login');
});

router.get('/register',checkAuth,function(req,res){
    res.render('register');
});

router.get('/logout',checkNotAuth,userController.userLogout);

router.post('/register', userController.userRegister);

router.get('/schedule',checkNotAuth, userController.showSchedule);

router.get('/user',checkNotAuth, userController.userHome);

router.get('/team',checkNotAuth, userController.userTeam);

router.post('/add', checkNotAuth, userController.userAddTeam);

router.post('/update', checkNotAuth, userController.userUpdateTeam);

router.post('/remove-team', checkNotAuth, userController.userRemoveTeam);

// Kontrola prihlásenia - presmerovanie Domov
function checkAuth(req,res,next){
    if(req.isAuthenticated()){
        return res.redirect('/user');
    }
    next();
}

// Kontrola neprihlásenia
function checkNotAuth(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash("danger","Prístup bol zamietnutý!")
    res.redirect(303,"/login");
}

module.exports = router