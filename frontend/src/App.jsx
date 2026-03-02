import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import axios from 'axios'

function App() {
  const [count, setCount] = useState(0)
  const [backendMessage, setBackendMessage] = useState('')
  const [backendStatus, setBackendStatus] = useState('')

  useEffect(() => {
    // Conectar con FastAPI backend
    axios.get('http://localhost:8000/')
      .then(response => {
        setBackendMessage(response.data.message)
      })
      .catch(error => {
        console.error('Error conectando al backend:', error)
        setBackendMessage('Error de conexión')
      })

    axios.get('http://localhost:8000/api/health')
      .then(response => {
        setBackendStatus(response.data.status)
      })
      .catch(error => {
        console.error('Error en health check:', error)
        setBackendStatus('offline')
      })
  }, [])

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React + FastAPI</h1>
      
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      
      <div className="card" style={{ marginTop: '2rem', background: '#f0f0f0', padding: '1rem', borderRadius: '8px' }}>
        <h3>Backend Status</h3>
        <p><strong>Mensaje:</strong> {backendMessage}</p>
        <p><strong>Estado:</strong> {backendStatus}</p>
      </div>
      
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
