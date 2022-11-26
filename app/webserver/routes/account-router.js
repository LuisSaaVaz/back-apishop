'use strict'

const express = require('express')

const createAccount = require('../controllers/account/create-account')
const validateAccount = require('../controllers/account/validate-acount')
const checkAccountSession = require('../controllers/account/check-account.session')
const {deleteMyAccount, deleteAccountById, deleteAllAccountsByAdmin
} = require('../controllers/account/delete-accounts')


const router = express.Router()
// create a new account
router.post('/accounts', createAccount)

// endpoint:(put) /users/activate/ activate a user
router.get('/accounts/confirm/:id', validateAccount)

//Borrar el usuario logueado
router.delete('/accounts/delete/myAccount', checkAccountSession, deleteMyAccount)

//Borrar usuarios por id
router.delete('/accounts/delete/byId/:id', checkAccountSession, deleteAccountById)

//Borrar todos los usuarios que no tengan status admin
router.delete('/accounts/delete/byAdmin', checkAccountSession, deleteAllAccountsByAdmin)

module.exports = router
