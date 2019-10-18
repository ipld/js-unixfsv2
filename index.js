'use strict'
const fs = require('./src/fs')
const createTypes = require('./src/schema')
const reader = require('./src/reader')

exports.encoder = fs
exports.reader = reader
exports.createTypes = createTypes
