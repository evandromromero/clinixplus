import './App.css'
import AppRoutes from './routes'
import { Toaster } from "@/components/ui/sonner"
import { SignatureModalProvider } from './components/SignatureModal'

function App() {
  return (
    <SignatureModalProvider>
      <AppRoutes />
      <Toaster />
    </SignatureModalProvider>
  )
}

export default App