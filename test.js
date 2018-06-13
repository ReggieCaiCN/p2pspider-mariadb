'use strict'

const P2PSpider = require('./lib/')
const Client = require('mariasql')
const iconv = require('iconv-lite')
const jschardet = require('jschardet')

const c = new Client({
	host: '127.0.0.1',
	user: 'root',
	password: 'root',
	db: 'db',
	charset: 'utf8mb4'
})

const infosel = c.prepare('SELECT id FROM info WHERE infohash = ?')
const infoins = c.prepare('INSERT INTO info (infohash, name, filenum, length, files) VALUES (?, ?, ?, ?, ?)')
const infoupd = c.prepare('UPDATE info SET freq = freq + 1 WHERE id = ?')

const p2p = P2PSpider({
	nodesMaxSize: 200,   // be careful
	maxConnections: 400, // be careful
	timeout: 5000
})

function decode(buf) {
	return iconv.decode(buf, jschardet.detect(buf).encoding)
}

p2p.ignore((infohash, rinfo, callback) => {
	let exist = false
	c.query(infosel([infohash]), (e, res) => {
		if (e) throw e
		if (res[0]) {
			exist = true
			c.query(infoupd([res[0].id]), (e, res) => { if (e) throw e })
		}
	})
	callback(exist)
	console.log('Get: ' + infohash)
})

p2p.on('metadata', metadata => {
	let filenum = 0
	let length = 0
	let files = null
	const name = metadata.info['name.utf-8'] || decode(metadata.info.name)
	if (metadata.info.files) {
		filenum = metadata.info.files.length
		let path = null
		files = metadata.info.files.reduce((pre, cur) => {
			length += cur.length
			if (cur['path.utf-8'])
				path = cur['path.utf-8'].reduce((pre, cur) => {
					if (pre) return pre + '/' + cur
					else return cur
				}, null)
			else
				path = cur.path.reduce((pre, cur) => {
					if (pre) return pre + '/' + decode(cur)
					else return decode(cur)
				}, null)
			path += '//' + cur.length
			if (pre) return pre + '///' + path
			else return path
		}, null)
	} else length = metadata.info.length
	c.query(infoins([metadata.infohash, name, filenum, length, files]), (e, res) => {
		if (e) {
			if (1062 == e.code) {
				c.query(infosel([metadata.infohash]), (e, res) => {
					if (e) throw e
					if (res[0]) c.query(infoupd([res[0].id]), (e, res) => { if (e) throw e })
				})
				return
			} else throw e
		}
	})
	console.log('Add: ' + metadata.infohash)
})

p2p.listen(6881, '0.0.0.0')

function end() {
	c.end()
	process.exit()
}

process.on('SIGINT', end)
process.on('SIGTERM', end)
