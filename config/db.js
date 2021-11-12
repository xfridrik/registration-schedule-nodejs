// database connect
const conString = process.env.DATABASE_URL || "postgresql://postgres:root@localhost/teamreg";
const{ Pool }=require("pg");
const tables="CREATE TABLE IF NOT EXISTS users (id bigserial PRIMARY KEY NOT NULL, name VARCHAR(200) not NULL, email VARCHAR(200) not NULL, password VARCHAR(200) not NULL, team bigint);" +
    "CREATE TABLE IF NOT EXISTS admins (id bigserial PRIMARY KEY NOT NULL, name VARCHAR(200) not NULL, email VARCHAR(200) not NULL, password VARCHAR(200) not NULL);" +
    "CREATE TABLE IF NOT EXISTS matches (id bigserial PRIMARY KEY NOT NULL, home bigint, guest bigint, round int not NULL, date date not NULL);" +
    "CREATE TABLE IF NOT EXISTS settings (variable TEXT not NULL unique, checked BOOLEAN not NULL);" +
    "CREATE TABLE IF NOT EXISTS teams (id bigserial PRIMARY KEY NOT NULL, name VARCHAR(100) NOT NULL UNIQUE, pin INT NOT NULL, preferred_match int);"

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
