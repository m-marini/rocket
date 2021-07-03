import {
    Scene, HemisphericLight, MeshBuilder, Vector3, StandardMaterial, Texture,
    CubeTexture, Color3, FollowCamera, UniversalCamera, Viewport, SceneLoader,
    AbstractMesh, Skeleton, IParticleSystem
} from "@babylonjs/core";
import { Container } from "react-bootstrap";
import { SceneComponent } from "./SceneComponent";
import '@babylonjs/loaders';
import { AdvancedDynamicTexture, TextBlock, Control } from 'babylonjs-gui';
import { MenuBar } from "./MenuBar";
import { Component } from "react";
import { ImportFile } from "./ImportFile";
import { homepage } from '../../package.json';
import { filter, map, tap, toArray } from 'rxjs/operators';
import { Observable } from "rxjs";
import { ajax } from 'rxjs/ajax';
import { csv, lines } from "./position-reader";
import { sprintf } from 'sprintf-js';
import { createTimeline, Status, Timeline } from "./Timeline";

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

const StatusDescr = [
    'Flying',
    'Landed',
    'Landed Out Of Platform',
    'Crashed On Platform',
    'Crashed Out Of Platform',
    'Crashed On Platform',
    'Crashed Out Of Platform',
    'Out Of Range',
    'Out Of Fuel'
];

const StatusColor = [
    'white',
    '#00ff00',
    '#d80000',
    '#d80000',
    '#d80000',
    '#d80000',
    '#d80000',
    '#d80000',
    '#d80000',
    '#d80000'
];

var huds: TextBlock[] | undefined;

var time = 0;
var timeline: Timeline | undefined;

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
function buildHud(scene: Scene) {
    const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("GUI", undefined, scene);
    const text1 = new TextBlock("HUD");
    text1.color = "white";
    text1.width = "250px";
    text1.height = "100px";
    text1.fontFamily = 'monospace';
    text1.fontSize = 20;
    text1.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    text1.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    text1.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    text1.paddingLeftInPixels = 10;
    advancedTexture.addControl(text1);

    const advancedTexture1 = AdvancedDynamicTexture.CreateFullscreenUI("GUI", undefined, scene);
    const text2 = new TextBlock('HUD1');
    text2.width = '400px';
    text2.height = '50px';
    text2.fontWeight = 'bold';
    text2.fontSize = '28';
    text2.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    text2.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    advancedTexture1.addControl(text2);
    return [text1, text2];
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

    huds = buildHud(scene);
    buildLights(scene);
    buildGround(scene);
    buildPlatform(scene);
    buildSkybox(scene);
    loadRocket(scene);
}

function renderHud(huds: TextBlock[] | undefined, status: Status) {
    if (!!huds) {
        const position = status.position;
        const d = Math.sqrt(position.x * position.x + position.z * position.z);
        const dirpn = 180 * Math.atan2(position.x, position.z) / Math.PI;
        const dir = Math.round(dirpn > 0 ? dirpn : dirpn + 360);

        const speed = status.speed;
        const vh = Math.sqrt(speed.x * speed.x + speed.z * speed.z);
        const vdirpn = 180 * Math.atan2(speed.x, speed.z) / Math.PI;
        const vdir = Math.round(vdirpn > 0 ? vdirpn : vdirpn + 360);
        const txt = sprintf('Pos   %05.1f %03d %05.1f\nSpeed %03.1f %03d %+03.1f\nFuel  %05.1f',
            d, dir, position.y,
            vh, vdir, speed.y,
            status.fuel);
        huds[0].text = txt;

        huds[1].text = StatusDescr[status.status];
        huds[1].color = StatusColor[status.status];
    }
    return huds;
}

/**
 * 
 * @param scene 
 */
function onRender(scene: Scene) {
    const dt1 = scene.getEngine().getDeltaTime() / 1000;
    const rocket = scene.getMeshByName('rocket');
    if (rocket && timeline) {
        time = time + dt1;
        const status = timeline.status(time);
        rocket.position = status.position;
        renderHud(huds, status);
    }
}

/**
 * 
 * @returns 
 */
function toStatus() {
    return map((data: number[]) => {
        return {
            position: new Vector3(data[0], data[2], data[1]),
            speed: new Vector3(data[3], data[5], data[4]),
            fuel: data[6],
            status: data[8]
        };
    });
}

function positionVectors() {
    return (obs: Observable<string>) => obs.pipe(
        lines(),
        filter(text => !!text),
        csv(),
        toStatus(),
        toArray()
    );
}

/**
 * 
 */
export class Home extends Component<{}, {
    importModalShown: boolean;
    timeline?: Timeline;
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

    private onPathReady(path: Status[]) {
        timeline = createTimeline(path);
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
                    onReplay={() => { time = 0; }}
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
