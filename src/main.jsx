import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from '@/App.jsx'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <BrowserRouter>
        <App />
        <Toaster 
            position="bottom-right"
            toastOptions={{
                success: {
                    style: {
                        background: '#f0fdf4',
                        color: '#166534',
                        border: '1px solid #bbf7d0',
                        padding: '16px',
                        borderRadius: '8px',
                    },
                    iconTheme: {
                        primary: '#22c55e',
                        secondary: '#ffffff',
                    },
                },
                error: {
                    style: {
                        background: '#fef2f2',
                        color: '#b91c1c',
                        border: '1px solid #fecaca',
                        padding: '16px',
                        borderRadius: '8px',
                    },
                    iconTheme: {
                        primary: '#ef4444',
                        secondary: '#ffffff',
                    },
                },
                duration: 5000,
            }}
        />
    </BrowserRouter>
)