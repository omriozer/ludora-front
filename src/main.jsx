import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { UserProvider } from '@/contexts/UserContext'
import { TutorialProvider } from '@/contexts/TutorialContext'
import App from '@/App.jsx'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <BrowserRouter>
        <UserProvider>
            <TutorialProvider>
                <App />
            </TutorialProvider>
        </UserProvider>
    </BrowserRouter>
) 