'use strict'

const P2PSpider = require('p2pspider')
const Client = require('mariasql')

const c = new Client({
	host: '127.0.0.1',
	user: 'user',
	password: 'password',
	db: 'db',
	charset: 'utf8mb4'
})

const infosel = c.prepare('SELECT id FROM info WHERE infohash = ?')
const infoins = c.prepare('INSERT INTO info (infohash, name, file, length) VALUES (?, ?, ?, ?)')
const infoupd = c.prepare('UPDATE info SET freq = freq + 1 WHERE id = ?')
const freqins = c.prepare('INSERT INTO freq (infoid) VALUES (?)')
const fileins = c.prepare('INSERT INTO file (infoid, path, length) VALUES (?, ?, ?)')

const p2p = P2PSpider({
	nodesMaxSize: 200,   // be careful
	maxConnections: 400, // be careful
	timeout: 5000
})

p2p.ignore((infohash, rinfo, callback) => {
	c.query(infosel([infohash]), (e, res) => {
		if (e) throw e
		if (res[0]) {
			c.query(infoupd([res[0].id]), (e, res) => { if (e) throw e })
			c.query(freqins([res[0].id]), (e, res) => { if (e) throw e })
			callback(true)
		} else callback(false)
	})
	console.log('Get: ' + infohash)
})

p2p.on('metadata', metadata => {
	c.query(infosel([metadata.infohash]), (e, res) => {
		if (e) throw e
		if (res[0]) {
			c.query(infoupd([res[0].id]), (e, res) => { if (e) throw e })
			c.query(freqins([res[0].id]), (e, res) => { if (e) throw e })
		} else {
			if (metadata.info.files) {
				var file = metadata.info.files.length
				var length = metadata.info.files.reduce((pre, cur) => pre + cur.length, 0)
			} else {
				var file = 0
				var length = metadata.info.length
			}
			c.query(infoins([metadata.infohash, metadata.info.name.toString(), file, length]), (e, res) => {
				if (e) throw e
				c.query(freqins([res.info.insertId]), (e, res) => { if (e) throw e })
				if (metadata.info.files)
					metadata.info.files.forEach((f) => {
						c.query(fileins([res.info.insertId, f.path.toString(), f.length]), (e, res) => { if (e) throw e })
					})
			})
			console.log('Add: ' + metadata.infohash)
		}
	})
})

p2p.listen(6881, '0.0.0.0')

function end() {
	c.end()
	process.exit()
}

process.on('SIGINT', end)
process.on('SIGTERM', end)
