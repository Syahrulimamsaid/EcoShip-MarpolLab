import { EventBus } from '../EventBus';
import { Scale, Scene } from 'phaser';

export class GameOver extends Scene
{
    camera!: Phaser.Cameras.Scene2D.Camera;
    background!: Phaser.GameObjects.Image;
    gameOverText!: Phaser.GameObjects.Text;

    constructor ()
    {
        super('GameOver');
    }

    create ()
    {
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0xff0000);

        this.background = this.add.image(0, 0, 'background');
        this.background.setAlpha(0.5);

        this.gameOverText = this.add.text(0, 0, 'Game Over', {
            fontFamily: 'Arial Black', fontSize: 64, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);

        this.layout(this.scale.width, this.scale.height);
        this.scale.on(Scale.Events.RESIZE, this.handleResize, this);
        
        EventBus.emit('current-scene-ready', this);

        this.events.once('shutdown', () => {
            this.scale.off(Scale.Events.RESIZE, this.handleResize, this);
        });
    }

    changeScene ()
    {
        this.scene.start('MainMenu');
    }

    private handleResize (gameSize: Phaser.Structs.Size)
    {
        this.layout(gameSize.width, gameSize.height);
    }

    private layout (width: number, height: number)
    {
        const centerX = width / 2;
        const centerY = height / 2;

        this.background.setPosition(centerX, centerY);
        this.background.setDisplaySize(width, height);
        this.gameOverText.setPosition(centerX, centerY);
    }
}
