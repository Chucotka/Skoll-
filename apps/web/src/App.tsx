import { useApp } from './state';
import AgeGate from './screens/AgeGate';
import Home from './screens/Home';
import CreateRoom from './screens/CreateRoom';
import Room from './screens/Room';
import Profile from './screens/Profile';
import Loading from './screens/Loading';

export default function App() {
  const { screen } = useApp();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
      {screen === 'loading' && <Loading />}
      {screen === 'age_gate' && <AgeGate />}
      {screen === 'home' && <Home />}
      {screen === 'create' && <CreateRoom />}
      {screen === 'room' && <Room />}
      {screen === 'profile' && <Profile />}
    </div>
  );
}
