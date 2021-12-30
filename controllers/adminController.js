const bcrypt = require("bcrypt");
const pool= require('../config/db');

// Registrácia administrátora po prvom štarte aplikácie
exports.adminRegister = async(req,res) => {
    const email = req.body.email;
    const pass = req.body.heslo;
    const name= req.body.meno;

    if(!email || !pass || !name) return missingInputData(req, res);

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
};

exports.adminShowSettings = async (req, res) => {
    try{
        const leagues = await pool.query('SELECT * FROM leagues');
        res.render('admin/settings', {
            leagues: leagues.rows
        });
    }catch (e) {
        console.log(e);
        req.flash("danger", 'Chyba pri hľadaní súťaží');
        res.redirect("/user");
    }
};

exports.match = async (req, res) => {
    const id = req.query.matchid;
    if(!id) return missingInputData(req, res);

    try{
        const match = await pool.query(
            "SELECT hteam.name as home, gteam.name as guest, mat.date as date from matches mat join teams hteam on mat.home=hteam.id join teams gteam on mat.guest=gteam.id where mat.id = $1",
            [id]
        );
        if(match.rows.length < 1){
            req.flash("danger", 'Zápas sa nenašiel');
            return res.redirect("/settings");
        }
        const dateString = dateToStringHTML(match.rows[0].date);
        res.render("admin/match",{
            hometeam:match.rows[0].home,
            guestteam:match.rows[0].guest,
            date:dateString,
            id:id
        });
    }catch (e) {
        console.log(e);
        req.flash("danger", 'Nastala chyba pri komunikácii s databázou');
        res.redirect("/settings");
    }
};

// Úprava dátumu v zápase
exports.editMatchDate = async (req,res) => {
    const date = req.body.date;
    const id=req.body.id;

    if(!date || !id) return missingInputData(req, res);

    pool.query("UPDATE matches SET date= $1 where id = $2",[date,id], (err) => {
        if(err){
            console.log(err);
            req.flash("danger", 'Nepodarilo sa upraviť zápas');
            return res.redirect("/settings");
        }else {
            req.flash("success",'Údaje boli úspešne zmenené!');
            res.redirect("/settings")
        }
    });
};

//Výmena domáceho tímu - SWAP
exports.swapMatchTeams = async (req,res) => {
    const id=req.body.id;

    if(!id) return missingInputData(req, res);

    pool.query(
        "SELECT * FROM matches where id = $1", [id], (err,result) =>{
            if(err || result.rows.length < 1){
                req.flash("danger", 'Nepodarilo sa nájsť zápas');
                return res.redirect("/settings");
            }else {
                pool.query(
                    "UPDATE matches SET home = $1, guest = $2 where id = $3", [result.rows[0].guest,result.rows[0].home,id], (err)=>{
                        if (err){
                            req.flash("danger", 'Nepodarilo sa upraviť zápas');
                            return res.redirect("/settings");
                        }else {
                            req.flash("success",'Domáci tím úspešne zmenený!');
                            res.redirect("/settings")
                        }
                    }
                );
            }
        }
    );
};

const dateToStringHTML = (date)=>{
    let dateString =  date.getFullYear().toString() + '-'
    if(date.getMonth()+1<10){
        dateString = dateString + '0' + (date.getMonth()+1).toString() + '-';
    }else{
        dateString = dateString + (date.getMonth()+1).toString() + '-';
    }
    if(date.getDate()<10){
        dateString = dateString + '0' + date.getDate().toString();
    }else{
        dateString = dateString + date.getDate().toString();
    }

    return (dateString);
}

const missingInputData = (req,res) => {
    req.flash("danger", 'Neboli zadané požadované údaje');
    return res.status(401).redirect("/");
}