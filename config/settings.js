//SETTINGS
const pool= require('../config/db');
const settingNames = ["ALLOW_REGISTRATION", "ALLOW_TEAM_ADDING", "ALLOW_TEAM_EDITING", "ALLOW_PUBLIC_SCHEDULE"];

const sets={};
async function initValues(){
    for(const variable of settingNames){
        try {
            const value = await pool.query(
                "SELECT * FROM settings where variable = $1;", [variable]
            );
            if(value.rows<1){
                try {
                    await pool.query(
                        "INSERT INTO settings (variable, checked) VALUES ($1,$2);", [variable,true]
                    );
                }catch (e) {
                    console.log(e);
                    return;
                }
                sets[variable] = true;
            }
            else{
                sets[variable] = value.rows[0].checked;
            }
        } catch (e) {
            console.log(e);
            return;
        }
    }
    console.log(sets);
}


const settings = {
    values:sets,
    init:true,
    async setAll(values) {
        const newSets={};
        for (const variable of settingNames) {
            if (values.includes(variable)) {
                try {
                    await pool.query(
                        "UPDATE settings SET checked=$1 where variable = $2;", [true, variable]
                    );
                }catch (e) {
                    console.log(e);
                    return;
                }
                newSets[variable] = true;
            }
            else{
                try {
                    await pool.query(
                        "UPDATE settings SET checked=$1 where variable = $2;", [false, variable]
                    );
                }catch (e) {
                    console.log(e);
                    return;
                }
                newSets[variable] = false;
            }
            this.values=newSets;
        }
    }
};

module.exports = settings;