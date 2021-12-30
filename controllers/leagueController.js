const pool= require('../config/db');

// Zobrazí ligu s id
exports.showLeague = async function(req, res) {
    if(!req.query.leagueid){
        req.flash("danger", "Operácia neúspešná! neboli zadané potrebné údaje!");
        res.status(401).redirect("/settings");
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
                                    res.render("admin/editleague", {
                                        league: result.rows[0],
                                        teams: result2.rows,
                                        matches: result3.rows
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

exports.updateLeague = async (req,res) => {
    if(!req.body.leagueid || !req.body.leaguename){
        req.flash("danger", "Operácia neúspešná! neboli zadané potrebné údaje!");
        res.status(401).redirect("/settings");
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

exports.addLeague = async (req,res) => {
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
            else{
                req.flash("success",'Súťaž bola pridaná!');
                res.redirect("/settings");
            }
        });
};

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
        teams=await pool.query("SELECT id, preferred_match FROM teams where league=$1 order by id;",[id]); // select teams in league
        const dates=await pool.query("SELECT start_date_first, start_date_second FROM leagues where id=$1;",[id]); // get dates and check, if exists
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
    // Vypocitaj pocet zapasov
    if(nteams%2===0){
        nrounds=nteams-1;
        nmatches=nteams/2;
    }
    else{
        nrounds=nteams;
        nmatches=(nteams+1)/2;
    }

    const matches = createMatchesTable(nrounds, nmatches, nteams, date, dateSecond)
    const orderedTeams = sortTeams(teams.rows, matches);

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

// Zoradí tímy tak, aby vysiel domaci zapas na ich preferovany zapas ak je to mozne,
// ostatne timy zoradi postupne do zostavajucich volnych miest
const sortTeams = (teams, matches) => {
    const notOrderedTeams=teams.slice();
    const orderedTeams=[];
    for (let i = 0; i < notOrderedTeams.length; i++) orderedTeams[i] = null;

    for(let i=0; i<notOrderedTeams.length; i++){
        for(let j=0; j<matches.length; j++){
            // Preferovaný zápas v danom kole - najdi volny domaci tím
            if(j+1 === notOrderedTeams[i].preferred_match){
                for(let k=0; k<matches[j].length; k++){
                    // Ak je nájdené volné miesto - priradí ho do ordered a vymaže z notOrdered
                    if(orderedTeams[(matches[j][k].hometeam)-1]===null){
                        orderedTeams[(matches[j][k].hometeam)-1]=notOrderedTeams[i];
                        notOrderedTeams[i]=null;
                        break;
                    }
                }
                break;
            }
        }
    }
    console.log("Zoradene timy")
    console.log(notOrderedTeams)
    console.log(orderedTeams)
    console.log("-------------------------\n Doplnene timy")
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
    console.log(notOrderedTeams)
    console.log(orderedTeams)
    console.log("-------------------------")
    return orderedTeams;
}

// Vytvorí rozpis zápasov - bregerovu tabulku
const createMatchesTable = (nrounds, nmatches, nteams, date, dateSecond) => {
    let table=[];
    let matches=[];

    // Vytvorí 2D tabuľku s účastníkmi (Schurigova metoda) - domáce tímy
    let count = 0;
    for (let i = 0; i < nrounds; i++) {
        table.push([]);
        for (let j = 0; j < nmatches; j++) {
            table[i].push(count % nrounds + 1);
            count++;
        }
    }

    // Spáruje tímy do zápasov
    for (let i = 0; i < nrounds; i++) {
        matches.push([]);
        for (let j = 0; j < nmatches; j++) {
            // Prvý zápas v kole
            if (j === 0) {
                // Ak je neparny pocet timov maju pauzu
                if (nteams % 2 !== 0) {
                    matches[i].push({
                        hometeam: table[i][j],
                        guestteam: table[i][j],//null,
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