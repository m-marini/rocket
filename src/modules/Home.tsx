import {
    Scene, Mesh, HemisphericLight, MeshBuilder, Vector3, StandardMaterial, Texture,
    CubeTexture, Color3, Color4, FollowCamera
} from "@babylonjs/core";
import { Container } from "react-bootstrap";
import SceneComponent from "./SceneComponent";

const MoonTextureUrl = '/rocket/texture/moon.jpg';
const PlatformTextureUrl = '/rocket/texture/platform.jpg';
const SkyBoxUrl = '/rocket/texture/skybox';
const PlatformRatio = 480 / 360;
const PlatformSize = 20;
const RocketSize = 3;

let box: Mesh | undefined;
let camera: FollowCamera | undefined;
let t: number = 0;

const Duration = 30;

const Path = [
    new Vector3(500, 150, 500),
    new Vector3(250, 150, 250),
    new Vector3(100, 100, 100),
    new Vector3(20, 10, 20),
    // new Vector3(250, 50, 2500),
    new Vector3(0, 0, 0)
];

/**
 * 
 * @param t 
 */
function rocketPos(t: number) {
    const n = Path.length;
    if (t >= Duration) {
        return Path[n - 1];
    } else {
        const nt = t * (n - 1) / Duration;
        const i = Math.floor(nt);
        const dl = nt - i;
        const p0 = Path[i];
        const p1 = Path[i + 1];
        const p01 = p1.subtract(p0);
        const p = p01.scale(dl).add(p0);
        return p;
    }
}

/**
 * 
 * @param scene 
 */
function createRocket(scene: Scene) {
    // Our built-in 'box' shape.
    const box = MeshBuilder.CreateBox("box", {
        size: RocketSize,
        faceColors: [Color4.FromInts(255, 255, 0, 255)]
    }, scene);
    // Move the box upward 1/2 its height
    const p = rocketPos(0);
    p.y += RocketSize / 2;
    box.position = p;
    return box;
}

function createCamera(scene: Scene) {
    // const canvas = scene.getEngine().getRenderingCanvas();
    // const camera = new FreeCamera("camera1", new Vector3(0, 30, -50), scene);
    // // This targets the camera to scene origin
    // camera.setTarget(Vector3.Zero());
    const p = rocketPos(0);
    const camera = new FollowCamera("camera1", p, scene);
    camera.radius = 10;
    camera.heightOffset = 1.7 - RocketSize / 2;
    // The goal rotation of camera around local origin (centre) of target in x y plane
    camera.rotationOffset = 0;
    // Acceleration of camera in moving from current to goal position
    // camera.cameraAcceleration = 0.005;
    camera.cameraAcceleration = 0.03;
    // The speed at which acceleration is halted
    camera.maxCameraSpeed = 200 / 3.6;
    // camera.attachControl(true);
    return camera;
}

/**
 * 
 * @param scene 
 */
function onSceneReady(scene: Scene) {
    box = createRocket(scene);
    // This attaches the camera to the canvas
    camera = createCamera(scene);
    // camera.target = box; // version 2.4 and earlier
    camera.lockedTarget = box; //version 2.5 onwards

    // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
    var light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
    // Default intensity is 1. Let's dim the light a small amount
    light.intensity = 0.7;
    // Texture
    const groundMat = new StandardMaterial("groundMat", scene);
    groundMat.diffuseTexture = new Texture(MoonTextureUrl, scene);

    // Our built-in 'ground' shape.
    const ground = MeshBuilder.CreateGround("ground", { width: 1000, height: 1000, subdivisions: 2 }, scene);
    ground.material = groundMat;
    ground.position.y = -0.01;

    // Texture
    const platMat = new StandardMaterial("platMat", scene);
    platMat.diffuseTexture = new Texture(PlatformTextureUrl, scene);

    // Our built-in 'ground' shape.
    const platform = MeshBuilder.CreateGround("platform", {
        width: PlatformSize * PlatformRatio,
        height: PlatformSize * PlatformRatio,
        subdivisions: 2
    }, scene);
    platform.material = platMat;

    const skybox = MeshBuilder.CreateBox("skyBox", { size: 1200 }, scene);
    const skyboxMaterial = new StandardMaterial("skyBox", scene);
    skyboxMaterial.backFaceCulling = false;
    skyboxMaterial.reflectionTexture = new CubeTexture(SkyBoxUrl, scene);
    skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
    skyboxMaterial.diffuseColor = new Color3(0, 0, 0);
    skyboxMaterial.specularColor = new Color3(0, 0, 0);
    skybox.material = skyboxMaterial;

}

/**
 * Will run on every frame render.  We are spinning the box on y-axis.
 */
const onRender = (scene: Scene) => {
    if (box !== undefined) {
        t += scene.getEngine().getDeltaTime() / 1000;
        const p = rocketPos(t).add(new Vector3(0, RocketSize / 2, 0));
        box.position = p;
        // camera?.setTarget(p);

        // var deltaTimeInMillis = scene.getEngine().getDeltaTime();
        // const rpm = 10;
        // box.rotation.y += ((rpm / 60) * Math.PI * 2 * (deltaTimeInMillis / 1000));
    }
}

export function Home() {
    return (
        <Container>
            <SceneComponent antialias
                width={1024}
                height={640}
                onSceneReady={onSceneReady}
                onRender={onRender} id='rocket-canvas' />
        </Container>
    );
}
