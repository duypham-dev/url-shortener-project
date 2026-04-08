import 'dotenv/config'
import app from './app/index.js'
const port = 3000

async function startServer() {
  try {
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`)
    })
  } catch (error) {
    console.error('Error starting server:', error)
  }
}

startServer()