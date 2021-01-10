import {
    Scene, HemisphericLight, MeshBuilder, Vector3, StandardMaterial, Texture,
    CubeTexture, Color3, FollowCamera, UniversalCamera, Viewport, SceneLoader,
    AbstractMesh, Skeleton, IParticleSystem
} from "@babylonjs/core";
import { Container } from "react-bootstrap";
import SceneComponent from "./SceneComponent";
import '@babylonjs/loaders';
import { MenuBar } from "./MenuBar";
import { Component } from "react";
import { ImportFile } from "./ImportFile";

const MoonTextureUrl = '/rocket/texture/moon.jpg';
const PlatformTextureUrl = '/rocket/texture/platform.jpg';
const SkyBoxUrl = '/rocket/texture/skybox';
const RootUrl = '/rocket/objs/';
const RocketFile = 'rocket.gltf';
const PlatformRatio = 480 / 360;
const PlatformSize = 20;
const Viewpoint = new Vector3(-20, 1.7, 40);
const Path = [
    new Vector3(500, 150, 500),
    new Vector3(250, 150, 250),
    new Vector3(100, 100, 100),
    new Vector3(20, 50, 30),
    new Vector3(7, 10, -3),
    new Vector3(-4, 0, 1)
];

/**
 * 
 * @param t 
 * @param dt 
 * @param path 
 */
function rocketPos(t: number, dt: number, path?: Vector3[]) {
    if (!path) {
        return Vector3.Zero();
    }
    const n = path.length;
    const duration = (n - 1) * dt;
    if (t >= duration) {
        return Path[n - 1];
    } else {
        const nt = t / dt;
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
function createCamera1(scene: Scene) {
    const camera = new FollowCamera("camera1", Viewpoint, scene);
    camera.radius = 45;
    camera.heightOffset = 1.7;
    camera.cameraAcceleration = 0.01;
    camera.maxCameraSpeed = 200 / 3.6;
    return camera;
}

/**
 * 
 * @param scene 
 */
function createCamera2(scene: Scene) {
    const camera = new UniversalCamera('camera2', Viewpoint, scene);
    camera.attachControl(true);
    return camera;
}

/**
 * 
 * @param scene 
 */
function loadRocket(scene: Scene) {
    // The first parameter can be set to null to load all meshes and skeletons
    SceneLoader.ImportMesh('10475_Rocket_Ship_v1_L3', RootUrl, RocketFile, scene,
        (meshes: AbstractMesh[], particles: IParticleSystem[], skeletons: Skeleton[]) => {
            onRocketLoad(scene, meshes[0]);
        });
}

/**
 * 
 * @param scene 
 * @param rocket 
 */
function onRocketLoad(scene: Scene, rocket: AbstractMesh) {
    const camera1 = scene.getCameraByName('camera1') as (FollowCamera | null);
    const camera2 = scene.getCameraByName('camera2') as (UniversalCamera | null);
    if (camera1 && camera2) {
        rocket.name = 'rocket';
        camera1.lockedTarget = rocket;
        camera2.lockedTarget = rocket;
    }
}

/**
 * 
 * @param scene 
 */
function onSceneReady(scene: Scene) {
    const camera = createCamera1(scene);

    const camera2 = createCamera2(scene);
    camera.viewport = new Viewport(0, 0, 0.5, 1.0);
    camera2.viewport = new Viewport(0.5, 0, 0.5, 1.0);

    scene.activeCameras?.push(camera);
    scene.activeCameras?.push(camera2);

    // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
    const light = new HemisphericLight("light", new Vector3(1, 1, 0), scene);
    // const light = new DirectionalLight("light", new Vector3(1, -1, -1), scene);
    // Default intensity is 1. Let's dim the light a small amount
    light.intensity = 1;

    // Texture
    const groundMat = new StandardMaterial("groundMat", scene);
    // groundMat.specularColor = Color3.White().scale(0.7);
    // groundMat.specularPower=0.5;
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
    loadRocket(scene);
}

export class Home extends Component<{}, {
    t: number;
    sampleInterval: number;
    path?: Vector3[];
    importModalShown: boolean
}>{

    /**
     * 
     * @param props 
     */
    constructor(props: {}) {
        super(props);
        this.state = {
            t: 0,
            sampleInterval: 30 / (Path.length - 1),
            path: Path,
            importModalShown: false
        };
    }

    /**
     * Will run on every frame render.  We are spinning the box on y-axis.
     */
    private onRender(scene: Scene) {
        const rocket = scene.getMeshByName('rocket');
        const { t: t0, path, sampleInterval } = this.state;
        const dt1 = scene.getEngine().getDeltaTime() / 1000;
        const t = t0 + dt1;
        if (rocket && path) {
            const p = rocketPos(t, sampleInterval, path);
            rocket.position = p;
        }
        this.setState({ t });
    }

    /**
     * 
     */
    private onReplay() {
        this.setState({ t: 0 });
    }

    /**
     * 
     */
    private showImportPanel() {
        this.setState({ importModalShown: true });
    }

    /**
     * 
     */
    private onImportCancel() {
        this.setState({ importModalShown: false });
    }

    /**
     * 
     * @param data 
     */
    private onImportFile(data: string | ArrayBuffer | null) {
        console.log(data);
        this.setState({ importModalShown: false, t: 0 });
    }

    /**
     * 
     * @param error 
     */
    private onImportError(error: string) {
        console.error(error);
        this.setState({ importModalShown: false });
    }

    render() {
        const { importModalShown } = this.state;
        return (
            <Container fluid>
                <MenuBar
                    onImport={() => this.showImportPanel()}
                    onReplay={() => this.onReplay()}
                />
                <Container fluid>
                    <SceneComponent antialias
                        width={1400}
                        height={640}
                        onSceneReady={onSceneReady}
                        onRender={scene => this.onRender(scene)} id='rocket-canvas' />
                </Container>
                <ImportFile show={importModalShown}
                    onCancel={() => { this.onImportCancel() }}
                    onFileRead={data => this.onImportFile(data)}
                    onError={e => this.onImportError(e)} />
            </Container>
        );
    }
}
