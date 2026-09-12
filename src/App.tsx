import { useRef } from 'react';
import { IRefPhaserGame, PhaserGame } from './PhaserGame';

function App()
{
    const phaserRef = useRef<IRefPhaserGame | null>(null);

    const currentScene = () => {
        // Scene callback retained for future integrations.
    }

    return (
        <div
            id="app"
            style={{
                width: '100vw',
                height: '100vh',
                margin: 0,
                padding: 0,
                overflow: 'hidden'
            }}
        >
            <div
                style={{
                    width: '100%',
                    height: '100%'
                }}
            >
                <PhaserGame ref={phaserRef} currentActiveScene={currentScene} />
            </div>
        </div>
    )
}

export default App
