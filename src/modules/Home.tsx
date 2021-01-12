import {
    Scene, HemisphericLight, MeshBuilder, Vector3, StandardMaterial, Texture,
    CubeTexture, Color3, FollowCamera, UniversalCamera, Viewport, SceneLoader,
    AbstractMesh, Skeleton, IParticleSystem
} from "@babylonjs/core";
import { Container } from "react-bootstrap";
import { SceneComponent } from "./SceneComponent";
import '@babylonjs/loaders';
import { MenuBar } from "./MenuBar";
import { Component } from "react";
import { ImportFile } from "./ImportFile";
import { homepage } from '../../package.json';
import { filter, map, tap, toArray } from 'rxjs/operators';
import { Observable } from "rxjs";
import { ajax } from 'rxjs/ajax';
import { csv, lines, vector3 } from "./position-reader";

const WebContext = homepage;
const MoonTextureUrl = `/${WebContext}/texture/moon.jpg`;
const PlatformTextureUrl = `/${WebContext}/texture/platform.jpg`;
const SkyBoxUrl = `/${WebContext}/texture/skybox`;
const RocketModelUrl = `/${WebContext}/objs/`;
const RocketFile = 'rocket.gltf';
const SampleUrl = `/${WebContext}/sample.csv`;
const PlatformRatio = 480 / 360;
const PlatformSize = 20;
const Viewpoint = new Vector3(-20, 1.7, 40);

const SampleInterval = 0.25;

/**
 * 
 */
class SceneStatus {
    private _t: number;
    private _sampleInterval: number;
    private _path: Vector3[] | undefined;

    constructor() {
        this._t = 0;
        this._sampleInterval = SampleInterval;
    }

    get t() { return this._t; }

    get sampleInterval() { return this._sampleInterval; }

    get path() { return this._path; }

    set t(t: number) { this._t = t; }

    set sampleInterval(sampleInterval: number) {
        this._sampleInterval = sampleInterval;
        this._t = 0;
    }

    set path(path: Vector3[] | undefined) {
        this._path = path;
        this._t = 0;
    }

    /**
     * 
    * @param t 
    * @param dt 
    * @param path 
    */
    position() {
        const { path, t, sampleInterval } = this;
        if (!path) {
            return Vector3.Zero();
        }
        const n = path.length;
        const duration = (n - 1) * sampleInterval;
        if (t >= duration) {
            return path[n - 1];
        } else {
            const nt = t / sampleInterval;
            const i = Math.floor(nt);
            const dl = nt - i;
            const p0 = path[i];
            const p1 = path[i + 1];
            const p01 = p1.subtract(p0);
            const p = p01.scale(dl).add(p0);
            return p;
        }
    }

    /**
     * 
     * @param dt 
     */
    last(dt: number) {
        this.t = this.t + dt;
        return this;
    }

    reset() {
        this._t = 0;
    }
}

/**
 * 
 * @param sampleInterval 
 * @param path 
 */
function createStatus(sampleInterval: number, path?: Vector3[]) {
    const status = new SceneStatus();
    status.path = path;
    status.sampleInterval = sampleInterval;
    return status;
}

const status = createStatus(SampleInterval);

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
    SceneLoader.ImportMesh('10475_Rocket_Ship_v1_L3', RocketModelUrl, RocketFile, scene,
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

        // const light = scene.getLightByName('light');
        // if (light) {
        //     const shadowGenerator = new ShadowGenerator(1024, light as DirectionalLight);
        //     shadowGenerator.addShadowCaster(rocket);
        // }
    }
}

function buildSkybox(scene: Scene) {
    const skybox = MeshBuilder.CreateBox("skyBox", { size: 1200 }, scene);
    const skyboxMaterial = new StandardMaterial("skyBox", scene);
    skyboxMaterial.backFaceCulling = false;
    skyboxMaterial.reflectionTexture = new CubeTexture(SkyBoxUrl, scene);
    skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
    skyboxMaterial.diffuseColor = new Color3(0, 0, 0);
    skyboxMaterial.specularColor = new Color3(0, 0, 0);
    skybox.material = skyboxMaterial;
    return skybox;
}

/**
 * 
 * @param scene 
 */
function buildGround(scene: Scene) {
    // Texture
    const groundMat = new StandardMaterial("groundMat", scene);
    groundMat.diffuseTexture = new Texture(MoonTextureUrl, scene);

    // Our built-in 'ground' shape.
    const ground = MeshBuilder.CreateGround("ground", { width: 1000, height: 1000, subdivisions: 2 }, scene);
    ground.material = groundMat;
    ground.position.y = -0.01;
    // ground.receiveShadows = true;
    return ground;
}

/**
 * 
 * @param scene 
 */
function buildPlatform(scene: Scene) {
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
    platform.receiveShadows = true;
    return platform;
}

/**
 * 
 * @param scene 
 */
function buildLights(scene: Scene) {
    // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
    const light = new HemisphericLight("light", new Vector3(1, 1, 0), scene);
    // const light = new DirectionalLight("light", new Vector3(1, -1, -1), scene);
    // Default intensity is 1. Let's dim the light a small amount
    light.intensity = 1;
    return light;
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

    buildLights(scene);
    buildGround(scene);
    buildPlatform(scene);
    buildSkybox(scene);
    loadRocket(scene);
}

/**
 * 
 * @param scene 
 */
function onRender(scene: Scene) {
    const dt1 = scene.getEngine().getDeltaTime() / 1000;
    status.last(dt1);
    const rocket = scene.getMeshByName('rocket');
    if (rocket) {
        rocket.position = status.position();
    }
}

function positionVectors() {
    return (obs: Observable<string>) => obs.pipe(
        lines(),
        filter(text => !!text),
        csv(),
        vector3(0),
        toArray()
    );
}

/**
 * 
 */
export class Home extends Component<{}, {
    importModalShown: boolean
}>{

    /**
     * 
     * @param props 
     */
    constructor(props: {}) {
        super(props);
        this.state = {
            importModalShown: false
        };
    }

    componentDidMount() {
        const obs = ajax({
            url: SampleUrl,
            responseType: 'text'
        }).pipe(
            map(data => data.response),
        );
        this.importFile(obs);

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

    private importFile(data: Observable<string>) {
        data.pipe(
            positionVectors(),
            tap(
                data => this.onPathReady(data),
                err => this.onImportError(err)
            )
        ).subscribe();
    }

    /**
     * 
     * @param data 
     */
    private onImportFile(data: Observable<string>) {
        this.setState({ importModalShown: false });
        this.importFile(data);
    }

    private onPathReady(path: Vector3[]) {
        status.path = path;
    }
    /**
     * 
     * @param error 
     */
    private onImportError(error: any) {
        console.error(error);
    }

    render() {
        const { importModalShown } = this.state;
        return (
            <Container fluid>
                <MenuBar
                    onImport={() => this.showImportPanel()}
                    onReplay={() => status.reset()}
                />
                <Container fluid>
                    <SceneComponent antialias
                        width={1400}
                        height={640}
                        onSceneReady={onSceneReady}
                        onRender={scene => { onRender(scene) }}
                        id='rocket-canvas' />
                </Container>
                <ImportFile show={importModalShown}
                    onCancel={() => { this.onImportCancel() }}
                    onSelect={obs => this.onImportFile(obs)} />
            </Container>
        );
    }
}
