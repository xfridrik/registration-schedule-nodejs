const bcrypt = require("bcrypt");
const pool= require('../config/db');

// Registrácia administrátora po prvom štarte aplikácie
exports.adminRegister = async(req,res) => {
    const email = req.body.email;
    const pass = req.body.heslo;
    const name = req.body.meno;

    if(!email || !pass || !name) return missingInputData(req, res);

    try {
        const encryptedPass = await bcrypt.hash(pass, 10);
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
            if(req.body.new){
                res.redirect("/settings");
            }else{
                res.redirect("/login");
            }
        } else {
            if (users.rows.length > 0) {
                req.flash("danger", 'Email už je registrovaný!');
            }
            res.redirect("/");
        }
    }catch (e) {
        console.log(e);
        req.flash("danger", "Registráciu sa nepodarilo vykonať")
        res.redirect("/");
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
            "SELECT hteam.id as hid, gteam.id as gid, hteam.name as home, gteam.name as guest, mat.date as date from matches mat join teams hteam on mat.home=hteam.id join teams gteam on mat.guest=gteam.id where mat.id = $1",
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
            hid:match.rows[0].hid,
            gid:match.rows[0].gid,
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
    const id = req.body.id;

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
                            res.redirect("/leagueschedule?leagueid="+result.rows[0].league);
                        }
                    }
                );
            }
        }
    );
};

exports.teamRegistration = async (req,res) => {
    try{
        const leagues = await pool.query('SELECT * FROM leagues');
        res.render('admin/addteam',{
            leagues:leagues.rows
        });
    }
    catch (e) {
        req.flash("danger", 'Nastala chyba!');
        res.redirect("/");
    }
};


// Pridať tím
exports.adminAddTeam = async (req,res) => {
    //kontrola zadania potrebných údajov na query
    if(!req.body.nazov || !req.body.league) return missingInputData(req, res);

    const name = req.body.nazov;
    const league = req.body.league;
    const preferred_match = req.body.prefmatch || 0;

    const sql = "INSERT INTO teams (name, preferred_match, league) VALUES ($1,$2,$3)";
    const sqlCheck = "SELECT * from teams where name = $1";
    const sqlCheck2 = "SELECT * from leagues where id = $1";

    let todo;
    let leagues;
    try{
        todo = await pool.query(sqlCheck,[name]);
        leagues = await pool.query(sqlCheck2,[league]);
    }catch (e) {
        console.log(e);
        req.flash("danger", 'Chyba pri komunikácii s databázou!');
        return res.redirect("/settings");
    }

    if (todo.rows.length > 0) { // tim uz existuje
        req.flash("danger", 'Tím s rovnakým názvom už existuje!');
        return res.redirect("/settings");

    }else if(leagues.rows.length !== 1) { // sutaz neexistuje
        req.flash("danger", 'Zadaná súťaž nebola nájdená!');
        return res.redirect("/settings");

    }else if(!leagues.rows[0].opened){
        req.flash("danger", 'Prihlasovanie do súťaže bolo ukončené!');
        return res.redirect("/settings");

    }else { // pridá tím do db
        pool.query(
            sql, [name, preferred_match, league], (err) => {
                if(err){
                    console.log(err)
                    req.flash("danger", 'Nepodarilo sa registrovať tím!');
                    res.redirect("/team");
                }
                else{
                    req.flash("success", 'Tím bol pridaný!');
                    return res.redirect("/settings");
                }
            });
    }
};

exports.AdminViewTeam = async (req,res) => {
    if(!req.query.teamid) return missingInputData(req, res);

    pool.query("SELECT * FROM teams where id = $1",[req.query.teamid],(err,result)=>{
        if(err){
            req.flash("danger", 'Nepodarilo sa zobraziť tím!');
            res.redirect("/settings");
        }
        else {
            if(result.rows.length>0){
                pool.query('SELECT * FROM leagues',(err,result2)=>{
                    if(err){
                        req.flash("danger", 'Nastala chyba!');
                        res.redirect("/user");
                    }else{
                        res.render("admin/leagueteam",{
                            team:result.rows[0],
                            leagues:result2.rows
                        });
                    }
                });
            }
            else{
                req.flash("danger", 'Nepodarilo sa nájsť tím!');
                res.redirect("/settings");
            }
        }
    });
};

// Upraviť prihlásený tím
exports.adminUpdateTeam = async (req,res) => {
    if(!(req.body.nazov) || !(req.body.teamid)) return missingInputData(req, res);

    const name = req.body.nazov;
    const preferred_match = req.body.prefmatch || 0;
    // či už taký tím neexistuje
    const sqlCheck="SELECT * from teams where name = $1 and id != $2";
    const todo=await pool.query(sqlCheck,[name,req.body.teamid]);
    if(todo.rows.length>0){
        req.flash("danger",'Tím s rovnakým názvom už existuje!');
        res.redirect("/settings");
        return;
    }

    const sql = "UPDATE teams SET name=$1, preferred_match=$2 where id = $3";
    pool.query(
        sql,[name,preferred_match,req.body.teamid],
        (err) => {
            console.log(err);
            if(err){
                req.flash("danger",'Nastala chyba!');
                res.redirect("/");
            }else {
                req.flash("success",'Údaje boli úspešne zmenené!');
                res.redirect("/showteam?teamid="+req.body.teamid);
            }
        });
};
// Odstrániť prihlásený tím
exports.adminRemoveTeam = (req, res) => {
    if(!(req.body.teamid)) return missingInputData(req, res);
    pool.query("UPDATE users SET team=$1 where team = $2;", [null, req.body.teamid], (err) => {
        if (err) {
            req.flash("danger", 'Nepodarilo sa odstrániť tím!');
            res.redirect("/settings");

        } else {
            pool.query("DELETE FROM teams where id = $1", [req.body.teamid], (err) => {
                if (err) {
                    console.log(err)
                    req.flash("danger", 'Nepodarilo sa vymazať záznam!');
                    res.redirect("/settings");

                } else {
                    req.flash("success", 'Tím bol odstránený z databázy!');
                    res.redirect("/settings");
                }
            })
        }

    })
};

// Konvertuje date na string pouzitelny v html elementoch
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