
//bibliothèques
var express = require('express');
const jwt = require('jsonwebtoken')
var bodyParser = require('body-parser');
const cors = require('cors');
const Pool = require('pg').Pool
var url = require('url');
var server = express();


//Configuration Server
server.use(bodyParser.urlencoded({
  limit: process.env.limit, extended: true
}));
server.use(express.json());
server.use(bodyParser.json({ limit: process.env.limit }));
server.use(cors());

//configuration BD

const pool = new Pool({
  user: process.env.user,
  host: process.env.host,
  database: process.env.database,
  password: process.env.password,
  port: 5432,
  sslmode: process.env.sslmode,
  ssl: process.env.ssl,
  sslfactory: process.env.sslfactory
});


//LES ROUTES


server.post('/api/justify', verifyToekn, (req, rep) => {
   let { text } = req.body;
  jwt.verify(req.token, 'apiKey', (err, data) => {

    if (err) {
      rep.send({response:false});
    } else {
      pool.query(
        "UPDATE tictactrip t set limitreq=limitreq+" + countWords(text) + " where t.useremail='" + data.user.email + "';",
        (err, res) => {
          if (err) { 
            rep.send({response:false});
          } else {
            cleanStr(text.trim()).then(resClean => {
              remove_linebreaks(resClean).then(show => {
                justify(show).then((resultat) => {
                  rep.json({
                    response:true,
                    textjustified: resultat,
                    data, count: countWords(text)
                  });
                  rep.end();
                });
              })
            })
          }

        }
      );
    }

  });
})
//les fonctions de la justification de textes
function countWords(text) {
  return text.split(' ').length;
}

async function remove_linebreaks(message) {
  return message.replace(/(\r\n|\n|\r)/gm, "");
}

async function cleanStr(str) {
  while (str.indexOf("\t") > -1) {
    str = str.replace("\t", " ");
  }
  while (str.indexOf("  ") > -1) {
    str = str.replace("  ", " ");
  }
  return str;
}



server.post('/api/login', (req, rep) => {
  let { email, password } = req.body.user;

   pool.query("select * from tictactrip where useremail='" + email + "' and userpassword='" + password + "'", (error, results) => {
    if (error) {
      throw error
    }
    if (results.rows.length > 0) {
      const user = {
        email: results.rows[0].useremail
      }
      jwt.sign({
        user
      }, 'apiKey', { expiresIn: '30m' }, (err, token) => {
        rep.send({response:true,
          token,limit:results.rows[0].limitreq
        });
        rep.end();
      });
    } else {
      rep.send({response:false})
    }

  }); 

});



server.post('/api/register', (request, response) => {
   let { email, password } = request.body.user;
  pool.query(
    "INSERT INTO tictactrip values('" + email + "','" + password + "'" + ")",
    (err, res) => {
      response.send({ response: true });
      response.end();
    }
  );  
});





//verification token
//documentation : https://github.com/auth0/node-jsonwebtoken
function verifyToekn(req, rep, next) {
  //récuperer header 
  const bearerHeader = req.headers['authorization'];
  if (typeof bearerHeader !== 'undefined') {

    const bearer = bearerHeader.split(' ');

    const bearerToken = bearer[1];

    req.token = bearerToken;
    next();

  } else {
    // sans token
    rep.sendStatus(403);
  }
}


//Main Function
 
async function justify(str) {

  var re = RegExp("(?:\\s|^)(.{1,80})(?=\\s|$)", "g");
  var res = [];
  var finalResult = [];

  while ((m = re.exec(str)) !== null) {
    res.push(m[1]);
  }

  for (var i = 0; i < res.length - 1; i++) {
    if (res[i].indexOf(' ') != -1) {
      while (res[i].length < 80) {
        for (var j = 0; j < res[i].length - 1; j++) {
          if (res[i][j] == ' ') {
            res[i] = res[i].substring(0, j) + " " + res[i].substring(j);
            if (res[i].length == 80) break;
            while (res[i][j] == ' ') j++;
          }
        }
      }
    }
    finalResult.push(res[i]);
  }

  finalResult.push(res[res.length - 1]);
  return finalResult.join('\n');
}


//L'écoute sur le Port 2020
server.listen(process.env.PORT ||2020, (err, res) => {
  if (err) {
    console.log(err)
  } else {
    console.log(process.env.Message)
  }
});

//Reset des limit une fois chaque jour

 var unefoisDay = 1000 * 60 * 60 * 24;
 
setInterval(function() {
 pool.query('UPDATE tictactrip set limitreq=0', (error, results) => {
   if (error) {
     throw error
   }
 })

},unefoisDay );   
