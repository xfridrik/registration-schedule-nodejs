const bcrypt = require("bcrypt");
const pool= require('../config/db');

// Odhlásenie
exports.userLogout = (req, res) => {
    req.logout();
    req.flash("success",'Úspešne odhlásené!');
    res.redirect("/login");
}

// Registrácia
exports.userRegister = async (req,res) => {
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
                req.flash("danger", 'Email už je registrovaný!');
            }
            res.render("register");
        }
    }catch (e) {
        console.log(e);
        req.flash("danger", "Registráciu sa nepodarilo vykonať")
        res.render("register");
    }
}

// Rozpis
exports.showSchedule = async (req,res) => {
    let leagues;
    let team;
    let leagueID;
    let i=1;
    let rounds = [];
    let pocetZapasov=0;
    let leaguesRounds=[];
    try {
        if(req.user.team){
            team = await pool.query("SELECT * FROM teams where id=$1;",[req.user.team]);
            leagueID=team.rows[0].league;
        }
        else{
            leagueID = null;
        }
        leagues = await pool.query("SELECT * FROM leagues;");
        for(let j = 0; j<leagues.rows.length; j++){
            do{
                const matches=await pool.query(
                    "SELECT hteam.name as home, gteam.name as guest, mat.date as date, mat.league as league, mat.id as id, mat.round as round FROM matches mat join teams hteam on mat.home=hteam.id join teams gteam on mat.guest=gteam.id where mat.round=$1 AND mat.league=$2 order by mat.round, mat.id",
                    [i,leagues.rows[j].id]
                )
                if(matches.rows.length>0){
                    rounds.push(matches.rows);
                }
                i++;
                pocetZapasov=matches.rows.length;
            }while (pocetZapasov!==0)
            leaguesRounds.push(rounds);
            rounds = [];
            i=1;
        }
    }
    catch (error){
        console.log(error);
        req.flash("danger","Pri generovaní nastala chyba!");
        return res.redirect('/');
    }

    res.render('schedule',{
        leagues: leagues.rows,
        matches: leaguesRounds,
        leagueID: leagueID
    });
};

// Domov
exports.userHome =  async (req,res) => {
    try{
        const leagues = await pool.query('SELECT * FROM leagues');
        res.render('user',{
            name:req.user.name,
            leagues:leagues.rows
        });
    }
    catch (e) {
        req.flash("danger", 'Nastala chyba!');
        res.redirect("/logout");
    }
};

// Tím
exports.userTeam = async (req,res) => {
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
};

// Pridať tím
exports.userAddTeam = async (req,res) => {
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
                    if(err){
                        console.log(err);
                        req.flash("danger", 'Nepodarilo sa registrovať tím!');
                        res.redirect("/team");

                    } else{ //pridá tím užívateľovi
                        pool.query("UPDATE users SET team=$1 where id = $2;",[result.rows[0].id,req.user.id],(err)=>{
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
};

// Upraviť tím
exports.userUpdateTeam = async (req,res) => {
    if(!(req.body.nazov)){
        req.flash("danger", "Operácia neúspešná! neboli zadané potrebné údaje!");
        res.redirect("/team");
    }
    const name = req.body.nazov;
    const preferred_match = req.body.prefmatch || 0;
    // Skontroluje, či už taký tím neexistuje
    const sqlCheck="SELECT * from teams where name = $1 and id != $2";
    const todo=await pool.query(sqlCheck,[name,req.user.team]);
    if(todo.rows.length>0){
        req.flash("danger",'Tím s rovnakým názvom už existuje!');
        res.redirect("/team")
        return;
    }

    const sql = "UPDATE teams SET name=$1, preferred_match=$2 where id = $3";
    pool.query(
        sql,[name,preferred_match,req.user.team],
        (err) => {
            console.log(err);
            if(err){
                req.flash("danger",'Nastala chyba!');
                res.redirect("/");
            }else {
                req.flash("success",'Údaje boli úspešne zmenené!');
                res.redirect("/team");
            }
        });
};

// Odstrániť tím
exports.userRemoveTeam = (req, res) => {
    pool.query("SELECT team from users where id=$1",[req.user.id],(err,result)=> {
        if (err) {
            req.flash("danger", 'Nepodarilo sa nájsť tím!');
            res.redirect("/team");
        } else {
            pool.query("UPDATE users SET team=$1 where id = $2;", [null, req.user.id], (err) => {
                if (err) {
                    req.flash("danger", 'Nepodarilo sa odstrániť tím!');
                    res.redirect("/team");

                } else {
                    pool.query("DELETE FROM teams where id = $1", [result.rows[0].team], (err) => {
                        if (err) {
                            console.log(err)
                            req.flash("danger", 'Nepodarilo sa vymazať záznam!');
                            res.redirect("/team");

                        } else {
                            req.flash("success", 'Tím bol odstránený z účtu!');
                            res.redirect("/user");
                        }
                    })
                }

            })
        }
    })
};