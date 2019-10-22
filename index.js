'use strict'
const fs = require('./src/fs')
const createTypes = require('./src/types')
const reader = require('./src/reader')

exports.encoder = fs
exports.reader = reader
exports.createTypes = createTypes
exports.types = fs.types
