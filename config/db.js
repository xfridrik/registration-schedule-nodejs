/*****************************************************
 *   Database connection and tables initialization
 *   References: https://node-postgres.com/features/connecting
 ******************************************************/

const tables="CREATE TABLE IF NOT EXISTS users (id bigserial PRIMARY KEY NOT NULL, name VARCHAR(200) not NULL, email VARCHAR(200) not NULL, password VARCHAR(200) not NULL, team bigint references teams(id) on delete set null, privileges VARCHAR(16) not NULL);" +
    "CREATE TABLE IF NOT EXISTS matches (id bigserial PRIMARY KEY NOT NULL, home bigint, guest bigint, round int not NULL, date date not NULL, league bigint);" +
    "CREATE TABLE IF NOT EXISTS teams (id bigserial PRIMARY KEY NOT NULL, name VARCHAR(100) NOT NULL UNIQUE, preferred_match int, league bigint not NULL);" +
    "CREATE TABLE IF NOT EXISTS leagues (id bigserial PRIMARY KEY NOT NULL, name VARCHAR(100) NOT NULL UNIQUE, start_date_first date not NULL, start_date_second date not NULL, nteams int not NULL, opened BOOLEAN not NULL);"

const conString = process.env.DATABASE_URL || "postgresql://postgres:root@localhost/teamreg";
const{ Pool }=require("pg");
let pool;

if(process.env.DATABASE_URL) {
    pool = new Pool({
        connectionString: conString,
        ssl: {
            rejectUnauthorized: false
        }
    });
}
else { //localhost
    pool = new Pool({
        connectionString: conString
    });
}

// Create tables on startup
pool.query(tables, (err) => {
    if(err){
        console.log(err);
        process.exit(1);
    }
});


module.exports = pool;
