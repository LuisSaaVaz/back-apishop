'use strict'

const express = require('express')
const login = require ('../controllers/auth/login-controller')

const router = express.Router()

// login
router.post('/auth', login)

module.exports = router