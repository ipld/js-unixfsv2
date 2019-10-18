'use strict'
const fs = require('./lib/fs')
const createTypes = require('./lib/schema')
const reader = require('./lib/reader')

exports.encoder = fs
exports.reader = reader
exports.createTypes = createTypes
