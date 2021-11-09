// database connect
const conString = process.env.DATABASE_URL || "postgresql://postgres:root@localhost/teamreg";
const{ Pool }=require("pg");
const tables="CREATE TABLE IF NOT EXISTS users (id bigserial PRIMARY KEY NOT NULL, name VARCHAR(200) not NULL, email VARCHAR(200) not NULL, password VARCHAR(200) not NULL, team bigint);" +
    "CREATE TABLE IF NOT EXISTS admins (id bigserial PRIMARY KEY NOT NULL, name VARCHAR(200) not NULL, email VARCHAR(200) not NULL, password VARCHAR(200) not NULL);" +
    "CREATE TABLE IF NOT EXISTS matches (id bigserial PRIMARY KEY NOT NULL, home bigint, guest bigint, round int not NULL, date date not NULL);" +
    "CREATE TABLE IF NOT EXISTS settings (variable TEXT not NULL unique, checked BOOLEAN not NULL);" +
    "CREATE TABLE IF NOT EXISTS teams (id bigserial PRIMARY KEY NOT NULL, name VARCHAR(100) NOT NULL UNIQUE, pin INT NOT NULL, preferred_match int);"
const settingNames = ["ALLOW_REGISTRATION", "ALLOW_TEAM_ADDING", "ALLOW_TEAM_EDITING", "ALLOW_PUBLIC_SCHEDULE"];

let pool
if(process.env.DATABASE_URL) {
    pool = new Pool({
        connectionString: conString,
        ssl: {
            rejectUnauthorized: false
        }
    });
}
else {
    //localhost
    pool = new Pool({
        connectionString: conString
    });
}

async function initTables() {
    await pool.query(tables, (err, res) => {
        console.log(err, res);
    });
}

//SETTINGS
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

initTables().then(initValues)

const settings = {
    values:sets,
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

module.exports = pool;
//return{pool,settings}