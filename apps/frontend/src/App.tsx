import {Navigate, Route, Routes } from "react-router-dom"
import LandingPage from "./features/LandingPage"
import DashBoard from "./features/DashBoard"
import AllCapsule from "./features/AllCapsule"
import MyCapsule from "./features/MyCapsule"
import CreateCapsule from "./features/CreateCapsule"
import UnlockCapsule from "./features/UnlockCapsule"

function App() {

  return (
    <>
          <Routes>
            <Route path="/" element={<LandingPage/>}/>
            <Route path="/dashboard" element={<DashBoard/>}>
              <Route index element={<Navigate to="all" replace />} />
              <Route path="all" element={<AllCapsule/>}/>
              <Route path="my" element={<MyCapsule/>}/>
              <Route path="create" element={<CreateCapsule/>}/>
              <Route path="unlock" element={<UnlockCapsule/>}/>
            </Route>

          </Routes>

    </>
  )
}

export default App
