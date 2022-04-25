const pool= require('../config/db');

// Zobrazenie sutaze pre upravu
exports.showLeague = async function(req, res) {
    if(!req.query.leagueid){
        req.flash("danger", "Operácia neúspešná! neboli zadané potrebné údaje!");
        return res.status(401).redirect("/settings");
    }else {
        pool.query("SELECT * FROM leagues where id = $1",[req.query.leagueid],(err,result)=>{
            if(err){
                req.flash("danger", "Nepodarilo sa nájsť záznam!");
                res.status(401).redirect("/settings");
            }else{
                if(result.rows.length<1){
                    req.flash("danger", "Nepodarilo sa nájsť súťaž!");
                    res.status(401).redirect("/settings");
                }else {
                    res.render("admin/editleague", {
                        league: result.rows[0]
                    })
                }
            }
        });
    }
};

// Zobrazenie zapasov pre administratora
exports.showLeagueSchedule = async function(req, res) {
    if(!req.query.leagueid){
        req.flash("danger", "Operácia neúspešná! neboli zadané potrebné údaje!");
        return res.status(401).redirect("/settings");
    }else {
        pool.query("SELECT * FROM leagues where id = $1",[req.query.leagueid],(err,result)=>{
            if(err){
                req.flash("danger", "Nepodarilo sa nájsť záznam!");
                res.status(401).redirect("/settings");
            }else{
                if(result.rows.length<1){
                    req.flash("danger", "Nepodarilo sa nájsť súťaž!");
                    res.status(401).redirect("/settings");
                }else {
                    pool.query("SELECT * FROM teams where league = $1",[result.rows[0].id],(err,result2)=>{
                        if(err){
                            req.flash("danger", "Nepodarilo sa nájsť prihlásené tímy!");
                            res.status(401).redirect("/settings");
                        }else{
                            pool.query("SELECT hteam.name as home, gteam.name as guest, mat.date as date, mat.league as league, mat.id as id, mat.round as round FROM matches mat join teams hteam on mat.home=hteam.id join teams gteam on mat.guest=gteam.id where mat.league=$1 order by mat.round, mat.id",[result.rows[0].id],(err,result3)=>{
                                if(err){
                                    req.flash("danger", "Nepodarilo sa nájsť zápasy!");
                                    res.status(401).redirect("/settings");
                                }else{
                                    const rounds = matchesToRounds(result3.rows);
                                    res.render("admin/leagueschedule", {
                                        league: result.rows[0],
                                        teams: result2.rows,
                                        rounds: rounds
                                    })
                                }
                            })
                        }
                    })
                }
            }
        });
    }
};

// Converts sorted array by rounds of matches into round arrays, round start index = 1
const matchesToRounds = (matches) =>{
    const rounds = [];
    if(matches.length<1){
        return rounds;
    }
    else {
        for(let i=0;i<matches[matches.length-1].round;i++){
            rounds.push([]);
            for(let j=0;j<matches.length;j++){
                if(matches[j].round === i+1){
                    rounds[i].push(matches[j]);
                }
            }
        }
        return rounds;
    }
}

// Zobrazenie prihlasenych timov
exports.showLeagueTeams = async function(req, res) {
    if(!req.query.leagueid){
        req.flash("danger", "Operácia neúspešná! neboli zadané potrebné údaje!");
        return res.status(401).redirect("/settings");
    }else {
        pool.query("SELECT * FROM teams where league = $1 order by id",[req.query.leagueid],(err,result)=>{
            if(err){
                req.flash("danger", "Nepodarilo sa nájsť prihlásené tímy!");
                res.status(401).redirect("/settings");
            }else{
                res.render("admin/leagueteams", {
                    teams: result.rows
                })
            }
        })
    }
};

// Uprava udajov sutaze
exports.updateLeague = async (req,res) => {
    if(!req.body.leagueid || !req.body.leaguename){
        req.flash("danger", "Operácia neúspešná! neboli zadané potrebné údaje!");
        return res.status(401).redirect("/settings");
    }
    let open = false;
    if(req.body.leagueopen){
        open = true;
    }
    const sql="UPDATE leagues SET name=$1, opened=$2 where id = $3;";
    pool.query(
        sql,[req.body.leaguename, open, req.body.leagueid],
        (err) => {
            console.log(err);
            if(err){
                req.flash("danger",'Nastala chyba!');
                res.redirect("/");
            }
            else{
                req.flash("success",'Súťaž bola upravená!');
                res.redirect("/settings");
            }
        });
};

// Pridanie novej sutaze
exports.addLeague = async (req,res) => {
    if(!req.body.startdatefirst || !req.body.startdatesecond || !req.body.nteams || !req.body.leaguename ){
        req.flash("danger", "Operácia neúspešná! neboli zadané potrebné údaje!");
        return res.status(401).redirect("/settings");
    }
    if(req.body.nteams<2){
        req.flash("danger", "Súťaž musí byť aspoň pre 2 tímy!");
        return res.redirect("/addleague");
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
                if(err.code === '23505'){
                    req.flash("danger",'Súťaž s rovnakým údajom už existuje!');
                }
                else {
                    req.flash("danger",'Nastala chyba!');
                }
                return res.redirect("/");
            }
            else{
                req.flash("success",'Súťaž bola pridaná!');
                res.redirect("/settings");
            }
        });
};

/*****************************************************
 *   Generovanie rozpisu sutaze
 *   Referencie: Froncek, Dalibor. (2010). Scheduling a Tournament. Mathematics and Sports. 10.5948/UPO9781614442004.018.
 ******************************************************/
exports.leagueGenerateSchedule = async (req,res) => {
    if(!req.body.leagueid){
        req.flash("danger", "Operácia neúspešná! neboli zadané potrebné údaje!");
        return res.status(401).redirect("/settings");
    }
    const id = req.body.leagueid; // ID ligy

    let date;
    let dateSecond;
    let teams;

    try {
        teams = await pool.query("SELECT id, preferred_match FROM teams where league=$1 order by id;",[id]); // select teams in league
        const dates = await pool.query("SELECT start_date_first, start_date_second FROM leagues where id=$1;",[id]); // get dates and check, if exists
        await pool.query('DELETE FROM matches where league=$1;',[id]); // delete old matches

        if(dates.rows.length<1){
            req.flash("danger","Súťaž nebola nájdená!");
            return res.redirect('/settings');
        }
        else{
            date = new Date(dates.rows[0].start_date_first);
            dateSecond = new Date(dates.rows[0].start_date_second);
        }
    }
    catch (error){
        console.log(error);
        req.flash("danger","Pri generovaní nastala chyba!");
        return res.redirect('/settings');
    }

    // Počet kôl
    let nrounds;
    // Počet zápasov v kole
    let nmatches;
    // Počet tímov
    let nteams = teams.rows.length;
    // Vypocita pocet zapasov
    if(nteams%2===0){
        nrounds=nteams-1;
        nmatches=nteams/2;
    }
    else{
        nrounds=nteams;
        nmatches=(nteams+1)/2;
    }

    // Vytvori tabulku kol so zapasmi
    const matches = createMatchesTable(nrounds, nmatches, nteams, date, dateSecond);
    // Zoradi timy podla preferencii
    const orderedTeams = sortTeams(teams.rows, matches);

    // Pridanie zapasov do databazy
    try{
        for(let i=0; i<matches.length; i++){
            for(let j=0; j<matches[i].length; j++){
                await pool.query(
                    'INSERT INTO matches (home, guest, round, date, league) VALUES ($1,$2,$3,$4,$5)',
                    [orderedTeams[matches[i][j].hometeam-1].id,orderedTeams[matches[i][j].guestteam-1].id,i+1,matches[i][j].date,id],
                )
            }
        }
        req.flash("success","Rozpis zápasov bol vygenerovaný");
        res.redirect('/settings');

    }catch (e) {
        console.log(e);
        req.flash("danger","Rozpis zápasov sa nepodarilo uložiť");
        res.redirect('/settings');
    }
};

exports.leagueRemoveSchedule = async (req, res) => {
    const id = req.body.leagueid; // ID ligy

    if(!id){
        req.flash("danger", "Operácia neúspešná! neboli zadané potrebné údaje!");
        return res.status(401).redirect("/settings");
    }

    pool.query("DELETE FROM matches where league = $1",[id],(err)=>{
        if(err){
            req.flash("danger","Nepodarilo sa odstrániť zápasy!");
            return res.redirect("/settings");
        }else {
            req.flash("success","Rozpis zápasov bol odstránený!");
            return res.redirect("/settings");
        }
    })
};

exports.leagueRemove = async (req, res) => {
    const id = req.body.leagueid; // ID ligy
    if(!id){
        req.flash("danger", "Operácia neúspešná! neboli zadané potrebné údaje!");
        return res.status(401).redirect("/settings");
    }
    // Delete matches
    await pool.query("DELETE FROM matches where league = $1",[id],(err)=>{
        if(err){
            req.flash("danger","Nepodarilo sa odstrániť zápasy!");
            return res.redirect("/settings");
        }
    })
    // Delete teams
    await pool.query("DELETE FROM teams where league = $1",[id],(err)=>{
        if(err){
            req.flash("danger","Nepodarilo sa odstrániť tímy!");
            return res.redirect("/settings");
        }
    })
    // Delete league
    await pool.query("DELETE FROM leagues where id = $1",[id],(err)=>{
        if(err){
            req.flash("danger","Nepodarilo sa odstrániť súťaž!");
            return res.redirect("/settings");
        }
    })
    req.flash("success","Súťaž a jej tímy boli odstránené!");
    return res.redirect('/settings');

};



// Zoradí tímy tak, aby vysiel domaci zapas na ich preferovany zapas ak je to mozne,
// ostatne timy zoradi postupne do zostavajucich volnych miest
const sortTeams = (teams, matches) => {
    const notOrderedTeams=teams.slice(); // Pole nezoradenych timov
    const orderedTeams=[]; // Pole zoradenych timov, index+1 je cislo timu z vygenerovanej tabulky zapasov
    for (let i = 0; i < notOrderedTeams.length; i++) orderedTeams[i] = null;

    for(let i=0; i<notOrderedTeams.length; i++){
        for(let j=0; j<matches.length; j++){ // Pocet kol
            // Preferovaný zápas v danom kole - najdi volny domaci tím
            if(j+1 === notOrderedTeams[i].preferred_match){
                for(let k=0; k<matches[j].length; k++){
                    // Ak je nájdené volné miesto (a nema volno) - priradí ho do ordered a vymaže z notOrdered
                    if(orderedTeams[(matches[j][k].hometeam)-1]===null && matches[j][k].hometeam !== matches[j][k].guestteam){
                        orderedTeams[(matches[j][k].hometeam)-1]=notOrderedTeams[i];
                        notOrderedTeams[i]=null;
                        break;
                    }
                }
                break;
            }
        }
    }

    // Pridať nepriradené tímy
    for(let i=0; i<notOrderedTeams.length; i++){
        if(notOrderedTeams[i]!==null){
            for(let j=0; j<orderedTeams.length; j++){
                if(orderedTeams[j]===null){
                    orderedTeams[j]=notOrderedTeams[i];
                    notOrderedTeams[i]=null;
                    break;
                }
            }
        }
    }

    return orderedTeams;
}
/*****************************************************
 *   Vytvorí rozpis zápasov - bregerovu tabulku, Schurigova metoda
 *   Referencie: Froncek, Dalibor. (2010). Scheduling a Tournament. Mathematics and Sports. 10.5948/UPO9781614442004.018.
 ******************************************************/
const createMatchesTable = (nrounds, nmatches, nteams, date, dateSecond) => {
    let table=[];
    let matches=[];

    // Vytvori 2D tabulku s ucastnikmi (Schurigova metoda) (iba domace timy)
    let count = 0;
    for (let i = 0; i < nrounds; i++) {
        table.push([]);
        for (let j = 0; j < nmatches; j++) {
            table[i].push(count % nrounds + 1);
            count++;
        }
    }
    // Sparuje timy do zapasov
    for (let i = 0; i < nrounds; i++) {
        matches.push([]);
        for (let j = 0; j < nmatches; j++) {
            // Prvy zapas v kole
            if (j === 0) {
                // Neparny pocet timov - pauza
                if (nteams % 2 !== 0) {
                    matches[i].push({
                        hometeam: table[i][j],
                        guestteam: table[i][j],
                        round: i+1,
                        date: new Date(date)
                    });
                }
                // Parny pocet timov - striedanie posledneho timu v prvom zápase kola
                else {
                    if (i % 2 === 0) {
                        matches[i].push({
                            hometeam: table[i][j],
                            guestteam: nteams,
                            round: i+1,
                            date: new Date(date)
                        });
                    } else {
                        matches[i].push({
                            hometeam: nteams,
                            guestteam: table[i][j],
                            round: i+1,
                            date: new Date(date)
                        });
                    }
                }
            }
            // Ostatne zapasy
            else {
                matches[i].push({
                    hometeam: table[i][j],
                    guestteam: table[(i + 1) % nrounds][nmatches - j - 1],
                    round: i+1,
                    date: new Date(date)
                });
            }
        }
        date.setDate(date.getDate() + 7);
    }

    /* Druha cast - vymena domacich timov */

    const firstMatches = matches.slice();
    date = dateSecond;
    let round = nrounds;

    for(let i = 0; i < firstMatches.length; i++){
        matches.push([]);
        for(let j = 0; j < firstMatches[0].length; j++){
            matches[round].push({
                hometeam: firstMatches[i][j].guestteam,
                guestteam: firstMatches[i][j].hometeam,
                round: round+1,
                date: new Date(date)
            });
        }
        round++;
        date.setDate(date.getDate() + 7);
    }
    return matches;
}