import express, { Application, Request, Response } from 'express'

const app: Application = express()
const PORT = 5000

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static('public'))

app.get('/build', (_req: Request, res: Response) => {
	res.sendFile('public/index.html')
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
