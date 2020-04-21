const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const mailer = require('../../modules/mailer');
const authConfig = require('../../config/auth');
const User = require('../models/User');

const router = express.Router();

function generateToken(params = {}) {
  return jwt.sign(params, authConfig.secret, {
    expiresIn: 86400,
  });
}

router.post('/register', async (req, res) => {
  const { email } = req.body;

  try {
    if (await User.findOne({ email })){
      return res.status(400).send({ error: 'User already exists' });
    }
    const user = await User.create(req.body);

    user.password = undefined; //pra nao vir no select, mesmo que no model esta como select: false

    return res.send({
      user,
      token: generateToken({ id: user.id }),
    });
  } catch (err) {
    return res.status(400).send({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password'); //pro password vir junto do select

  if (!user){
    return res.status(400).send({ error: 'User not found' });
  }

  if (!await bcrypt.compare(password, user.password)){
    return res.status(400).send({ error: 'Invalid password' });
  }
  
  user.password = undefined;

  res.send({
    user,
    token: generateToken({ id: user.id }),
  });
});

router.post('/forgot_password', async (req, res) => {
  const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user){
      return res.status(400).send({ error: 'User not found' });
    }
    const token = crypto.randomBytes(20).toString('hex'); //este token é só pra recuperação de senha, basicamente é uma sequencia de numeros

    const now = new Date();
    now.setHours(now.getHours() + 1);

    await User.findByIdAndUpdate(user.id, {
      '$set': {
        passwordResetToken: token,
        passwordResetExpires: now,
      }
    });

    var mail = {
        to: email,
        from: 'emailIlustrativo@gmail.com',
        template: 'forgot_password',
        context: { token }
    };

    mailer.sendMail(mail);
    return res.send();
  });

router.post('/reset_password', async (req, res) => {
  const { email, token, password } = req.body;

  try {
    const user = await User.findOne({ email })
      .select('+passwordResetToken passwordResetExpires');

    if (!user){
      return res.status(400).send({ error: 'User not found' });
    }

    if (token !== user.passwordResetToken){ 
      return res.status(400).send({ error: 'Token invalid' });
    }

    const now = new Date();

    if (now > user.passwordResetExpires){
      return res.status(400).send({ error: 'Token expired, generate a new one' });
    }

    user.password = password;

    await user.save();

    res.send();
  } catch (err) {
    res.status(400).send({ error: 'Cannot reset password, try again' });
  }
});

router.get('/userList', async (req,res)=>{
  const users = await User.find({});
  res.send({ users })
});

module.exports = app => app.use('/auth', router); //recebe o app do index.js principal