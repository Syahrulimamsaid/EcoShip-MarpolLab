import { Boot } from "./scenes/Boot";
import { GameOver } from "./scenes/GameOver";
import { Game as MainGame } from "./scenes/Game";
import { HasilUmpanBalik } from "./scenes/HasilUmpanBalik/HasilUmpanBalik";
import { MainMenu } from "./scenes/MainMenu/MainMenu";
import { AUTO, Game, Scale } from "phaser";
import { OwsMateri } from "./scenes/OwsMateri/OwsMateri";
import { OwsQuiz } from "./scenes/OwsMateri/OwsQuiz";
import { PilahSampah } from "./scenes/PilahSampah/PilahSampah";
import { Preloader } from "./scenes/Preloader";
import { PilihAktivitasStabilitas } from "./scenes/StabilitasMateri/PilihAktivitasStabilitas";
import { QuizScene } from "./scenes/Quiz/QuizScene";
import { StabilitasMateri } from "./scenes/StabilitasMateri/StabilitasMateri";
import { StabilitasQuiz } from "./scenes/StabilitasMateri/StabilitasQuiz";
import { StabilitasSimulatorResult } from "./scenes/StabilitasMateri/StabilitasSimulatorResult";
import { SimulatorOws } from "./scenes/SimulatorOws/SimulatorOws";
import { SimulatorStabilitas } from "./scenes/SimulatorStabilitas/SimulatorStabilitas";
import { Tentang } from "./scenes/Tentang/Tentang";

//  Find out more information about the Game Config at:
//  https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: 1920,
    height: 1080,
    parent: "game-container",
    backgroundColor: "#028af8",
    scale: {
        mode: Scale.FIT,
        autoCenter: Scale.CENTER_BOTH,
    },
    render: {
        antialias: true,
        pixelArt: false,
    },
    scene: [
        Boot,
        Preloader,
        MainMenu,
        OwsMateri,
        SimulatorOws,
        OwsQuiz,
        PilahSampah,
        QuizScene,
        StabilitasMateri,
        PilihAktivitasStabilitas,
        StabilitasQuiz,
        SimulatorStabilitas,
        StabilitasSimulatorResult,
        HasilUmpanBalik,
        Tentang,
        MainGame,
        GameOver,
    ],
};

const StartGame = (parent: string) => {
    return new Game({ ...config, parent });
};

export default StartGame;
