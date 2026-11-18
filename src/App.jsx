import { Route, Routes } from 'react-router-dom'
import './App.css'
import Header from './components/Header'
import MainPage from './pages/MainPage'
import Locations from './pages/Locations'

function App() {
  

  return (
    <>
     <Header/>
     <Routes>
      <Route path='/' element={<MainPage/>}/>
      <Route path='/locations' element={<Locations/>}/>
     </Routes>
    </>
  )
}

export default App
