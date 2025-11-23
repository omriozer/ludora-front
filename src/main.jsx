import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { UserProvider } from '@/contexts/UserContext'
import { LoginModalProvider } from '@/hooks/useLoginModal'
import App from '@/App.jsx'
import '@/index.css'
import '@/styles/hebrew-fonts.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <BrowserRouter>
        <LoginModalProvider>
            <UserProvider>
                <App />
            </UserProvider>
        </LoginModalProvider>
    </BrowserRouter>
) 