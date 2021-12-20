// database connect
const conString = process.env.DATABASE_URL || "postgresql://postgres:root@localhost/teamreg";
const{ Pool }=require("pg");
const tables="CREATE TABLE IF NOT EXISTS users (id bigserial PRIMARY KEY NOT NULL, name VARCHAR(200) not NULL, email VARCHAR(200) not NULL, password VARCHAR(200) not NULL, team bigint, privileges VARCHAR(16) not NULL);" +
    "CREATE TABLE IF NOT EXISTS matches (id bigserial PRIMARY KEY NOT NULL, home bigint, guest bigint, round int not NULL, date date not NULL, league bigint);" +
    "CREATE TABLE IF NOT EXISTS teams (id bigserial PRIMARY KEY NOT NULL, name VARCHAR(100) NOT NULL UNIQUE, preferred_match int, league bigint);" +
    "CREATE TABLE IF NOT EXISTS league (id bigserial PRIMARY KEY NOT NULL, name VARCHAR(100) NOT NULL UNIQUE, start_date date not NULL, opened BOOLEAN not NULL);"

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

pool.query(tables, (err, res) => {
    if(err){
        console.log(err);
        process.exit(1);
    }
});


module.exports = pool;
