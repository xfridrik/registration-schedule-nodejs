const bcrypt = require("bcrypt");
const pool= require('../config/db');

// Registrácia administrátora po prvom štarte aplikácie
exports.adminRegister = async(req,res) => {
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
    if(!id){
        req.flash("danger", 'Neboli zadané požadované údaje');
        return res.redirect("/settings");
    }
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