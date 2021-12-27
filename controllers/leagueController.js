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
                            res.render("admin/editleague", {
                                league: result.rows[0],
                                teams: result2.rows
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

    let pocetKol;
    let pocetZapasov;
    let tabulka=[];
    let zapasy=[];

    // Vypocitaj pocet zapasov
    if(teams.rows.length%2===0){
        pocetKol=teams.rows.length-1;
        pocetZapasov=teams.rows.length/2;
    }
    else{
        pocetKol=teams.rows.length;
        pocetZapasov=(teams.rows.length+1)/2;
    }
    let count=0;
    //vytvori 2D tabulku
    for (let i = 0; i < pocetKol; i++) {
        tabulka.push([])
        for (let j = 0; j < pocetZapasov; j++) {
            tabulka[i].push(count%pocetKol+1);
            count++;
        }
    }
    for (let i = 0; i < pocetKol; i++) {
        zapasy.push([])
        for (let j = 0; j < pocetZapasov; j++) {
            if(j===0){
                //ak je neparny pocet timov maju pauzu
                if(teams.rows.length%2!==0){
                    zapasy[i].push({
                        hometeam: tabulka[i][j],
                        guestteam: tabulka[i][j],//null,
                        date: new Date(date)
                    });
                }
                else{
                    if(i%2===0){
                        //striedanie posledneho timu
                        zapasy[i].push({
                            hometeam: tabulka[i][j],
                            guestteam: teams.rows.length,
                            date: new Date(date)
                        });
                    }
                    else{
                        zapasy[i].push({
                            hometeam: teams.rows.length,
                            guestteam: tabulka[i][j],
                            date: new Date(date)
                        });
                    }
                }
            }
            else {
                zapasy[i].push({
                    hometeam: tabulka[i][j],
                    guestteam: tabulka[(i + 1) % pocetKol][pocetZapasov - j - 1],
                    date: new Date(date)
                });
            }
            //Preferovaný zápas
            const matchID = await pool.query(
                'INSERT INTO matches (home, guest, round, date, league) VALUES ($1,$2,$3,$4,$5) RETURNING id',
                [teams.rows[zapasy[i][j].hometeam-1].id,teams.rows[zapasy[i][j].guestteam-1].id,i+1,zapasy[i][j].date,id],
            )

            if(i+1===teams.rows[zapasy[i][j].guestteam-1].preferred_match){
                await preferredMatchSwap(matchID.rows[0].id);
            }
        }
        date.setDate(date.getDate()+7);
    }
    console.log(zapasy);

    req.flash("success","Rozpis zápasov bol vygenerovaný");

    res.redirect('/settings');

};

const preferredMatchSwap = async (matchID) => {
    const id = matchID;
    const match = await pool.query(
        "SELECT * FROM matches where id = $1", [id]
    );

    pool.query(
        "UPDATE matches SET home = $1, guest = $2 where id = $3", [match.rows[0].guest, match.rows[0].home, id]
    );
}