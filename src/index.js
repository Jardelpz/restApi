const express = require('express');
const bodyParser = require('body-parser');

const app = express();

app.use(bodyParser.json()); //entender a requição em json
app.use(bodyParser.urlencoded({ extended: false })); //entender informaç~eos via url

require('./app/controllers/index')(app); // automatiza o processo de colocar todos os diretorios aqui enviando o app para todos os controllers

app.listen(3000);