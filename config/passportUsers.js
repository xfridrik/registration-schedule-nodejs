const LocalStrategy = require("passport-local").Strategy;
const pool=require('./db');
const bcrypt= require("bcrypt");

function initialize(passport){
    passport.use(new LocalStrategy({
            usernameField: 'email',
            passwordField: 'heslo'
        },
        function(email, password, done){
            console.log(email);
            console.log(password);
            pool.query(
                'SELECT * from users WHERE email =$1',[email],
                (err, results) => {
                    if (err){
                        throw err;
                    }
                    //console.log(results.rows);
                    if(results.rows.length>0){
                        const user=results.rows[0];
                        bcrypt.compare(password, user.password, (err, match)=>{
                            if(err){
                                throw err;
                            }
                            if(match){
                                return done(null,user);
                            }
                            else{
                                return done(null,false,{type:"danger",message:"Zadal/a si nesprávne heslo"});
                            }
                        })
                    }
                    else{
                        return done(null,false,{type:"danger",message:"Používatel sa nenašiel"})
                    }
                }
            )
        }
    ));

    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    passport.deserializeUser( function(id,done){
        pool.query(
            'SELECT * FROM users WHERE id=$1',[id],
            (err,results)=>{
                if(err){
                    throw err;
                }
                done(null, results.rows[0]);
            }
        )
    })
}
module.exports=initialize;
