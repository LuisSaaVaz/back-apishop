'use strict'

const express = require('express')

const checkAccountSession = require('../controllers/account/check-account.session')
const likeProduct = require('../controllers/likes/add-new-like')
const {
  getAllLikes,
  getLikesByProductId,
  getLikesByUserId,
  getLikesByLoverId,
} = require('../controllers/likes/get-likes')
const {
  deleteLikeById,
  deleteLikeByProductId,
} = require('../controllers/likes/delete-like')

const router = express.Router()

// create a new like
router.post('/likes/:product_id', checkAccountSession, likeProduct)

// get all likes
router.get('/likes', getAllLikes)

// get likes by product id
router.get('/likes/filterBy/productId/:product_id', getLikesByProductId)

// get likes by user id
router.get('/likes/filterBy/userId/:user_id', getLikesByUserId)

// get likes by lover id
router.get(
  '/likes/filterBy/loverId/:lover_id',
  checkAccountSession,
  getLikesByLoverId
)

// delete like by id
router.delete('/likes/delete/byId/:id', checkAccountSession, deleteLikeById)

// delete like by product id
router.delete(
  '/likes/delete/byProductId/:product_id',
  checkAccountSession,
  deleteLikeByProductId
)

module.exports = router
