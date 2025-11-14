import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { UserProvider } from '@/contexts/UserContext'
import { LoginModalProvider } from '@/hooks/useLoginModal'
import App from '@/App.jsx'
import '@/index.css'
import '@/styles/hebrew-fonts.css'
import { clog } from '@/lib/utils'

clog('✅ Frontend app successfully initialized with updated environment variables');
clog('🌐 API Base URL:', import.meta.env.VITE_API_BASE);

ReactDOM.createRoot(document.getElementById('root')).render(
    <BrowserRouter>
        <UserProvider>
            <LoginModalProvider>
                <App />
            </LoginModalProvider>
        </UserProvider>
    </BrowserRouter>
) 