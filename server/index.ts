import express, { Application, Request, Response } from 'express'
import path from 'path'

const app: Application = express()
const PORT = 5000

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static('public'))

app.get('/', (_req: Request, res: Response) => {
	res.sendFile(path.resolve(__dirname, 'public', 'index.html'))
})

app.get('/api', (_req: Request, res: Response) => {
	res.send('Hello Express')
})

try {
	app.listen(PORT, () => {
		console.log(`dev server running at: http://localhost:${PORT}/`)
	})
} catch (e) {
	if (e instanceof Error) {
		console.error(e.message)
	}
}
