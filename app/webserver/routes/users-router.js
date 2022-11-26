'use strict'

const express = require('express')
const multer = require('multer')

const checkAccountSession = require('../controllers/account/check-account.session')
const putScoreUsers = require('../controllers/users/score-user-controller')
const { getUser, getOwnerUser } = require('../controllers/users/get-user')
const {
    putUpdateUserInfo,
    putUpdateUserAvatar,
    putUpdateUserStatus,
} = require('../controllers/users/put-update-user')

const upload = multer()

// Users routes
const router = express.Router()

// Actualizar el score del usuario
router.put('/users/score/:id', checkAccountSession, putScoreUsers)

// Actualizar el usuario: name y bio
router.put('/users/update/info', checkAccountSession, putUpdateUserInfo)

// Actualizar el status del usuario
router.put('/users/update/status/:id', checkAccountSession, putUpdateUserStatus)

router.get('/users/', checkAccountSession, getUser)

router.get('/users/filterBy/id/:id', getOwnerUser)

module.exports = router
// Actualizar el usuario: avatar
router.put(
    '/users/update/avatar',
    checkAccountSession,
    upload.single('avatar'),
    putUpdateUserAvatar
)

module.exports = router
