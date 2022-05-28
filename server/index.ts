import express, { Application, Request, Response } from 'express'
import http from 'http'
import { Server } from 'socket.io'
import path from 'path'

const PORT = 5000
const app: Application = express()
const server = http.createServer(app)
const io = new Server(server).listen(PORT)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static('public'))

io.on('connection', (socket) => {
	console.log('connection : ', socket.id)

	// 切断時の処理
	socket.on('disconnect', () => {
		console.log('disconnect : ', socket.id)
	})

	// signalingデータ受信時の処理
	socket.on('signaling', (objData) => {
		console.log('signaling : ', socket.id)
		console.log(' - type : ', objData.type)
		objData.socketid = socket.id
		// 送信元以外の全員に送信
		socket.broadcast.emit('signaling', objData)
	})
})

app.get('/', (_req: Request, res: Response) => {
	res.sendFile(path.resolve(__dirname, 'public', 'index.html'))
})

app.get('/ws', (_req: Request, res: Response) => {
	res.redirect('ws://loacalhost:3000')
})

app.get('/api', (_req: Request, res: Response) => {
	res.send('Hello Express')
})

console.log(`dev Server is listening http://localhost:${PORT}`)
