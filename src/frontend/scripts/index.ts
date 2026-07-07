import { util, component } from "./global.js";

// @ts-ignore
import * as THREE from 'three';

function format_time(date: Date) {
    const dt_ms = Date.now() - date.getTime();
    const dt_days = Math.floor(dt_ms / (1000 * 60 * 60 * 24));

    return dt_days == 0
        ? "today"
        : dt_days == 1
        ? "1 day ago"
        : `${dt_days} days ago`;
}

async function get_repo(project: string) {
    const res = await fetch(`https://api.github.com/repos/cactoes/${project}`);
    if (!res.ok)
        return undefined;

    return res.json();
}

function setup_card(card: Element) {
    const project = card.getAttribute("project");
    if (!project)
        return;

    card.addEventListener("click", () => {
        window.open(`https://github.com/cactoes/${project}`, "_blank");
    });

    const target_element = card.querySelector(".card-footer>.updated");

    get_repo(project).then(data => {
        if (!data) {
            if (target_element)
                target_element.textContent = "? days ago";

            return;
        }

        const date = new Date(data.updated_at);
        const label = format_time(date);

        if (target_element)
            target_element.textContent = label;
    });
}

// @ts-ignore
async function main(): Promise<void> {
    util.check_logged_in().then(is_logged_in => {
        const login_button = document.getElementById("login");
        const home_button = document.getElementById("home");
        if (is_logged_in) {
            if (login_button)
                login_button.style.display = "none";
            
        } else {
            login_button?.addEventListener("click", () => window.location.href = "/login");
            if (home_button)
                home_button.style.display = "none";
        }
    });

    component.set_version();
    component.set_clock();

    document
        .querySelectorAll("section>span")
        .forEach(setup_card);
}

window.addEventListener("DOMContentLoaded", main);


////////////////////////////////////////////////////////////////
// background animation render

// const isMobile = /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent);
// for now force mobile since high performance is NOT needed
const isMobile = true;

const renderer = new THREE.WebGLRenderer({
    antialias: !isMobile,
    powerPreference: isMobile ? 'low-power' : 'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0a);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 10, 100);
camera.position.z = 30;

// Reduced geometry complexity on mobile
const tubularSegments = isMobile ? 100 : 200;
const radialSegments = isMobile ? 16 : 32;
const geometry = new THREE.TorusKnotGeometry(10, 3, tubularSegments, radialSegments).toNonIndexed();

const positionAttribute = geometry.attributes.position;
const normalAttribute = geometry.attributes.normal;
const colors = new Float32Array(positionAttribute.count * 3);
geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

const material = new THREE.MeshBasicMaterial({
    vertexColors: true
});

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

const tempVector = new THREE.Vector3();
const tempNormal = new THREE.Vector3();
const matrix = new THREE.Matrix4();
const normalMatrix = new THREE.Matrix3();

// Pre-allocate depth data array to avoid garbage collection
const depthData = new Float32Array(positionAttribute.count);

// Throttle depth updates on mobile
let lastDepthUpdate = 0;
const depthUpdateInterval = isMobile ? 100 : 16;

function updateDepthColors() {
    mesh.updateMatrixWorld();
    matrix.copy(mesh.matrixWorld).invert();
    normalMatrix.getNormalMatrix(mesh.matrixWorld);
    
    const cameraLocal = camera.position.clone().applyMatrix4(matrix);
    
    let minDepth = Infinity;
    let maxDepth = -Infinity;
    
    for (let i = 0; i < positionAttribute.count; i++) {
        tempVector.fromBufferAttribute(positionAttribute, i);
        tempNormal.fromBufferAttribute(normalAttribute, i);
        
        tempNormal.applyMatrix3(normalMatrix).normalize();
        
        const depth = tempVector.distanceTo(cameraLocal);
        const viewDirection = cameraLocal.clone().sub(tempVector).normalize();
        const facingRatio = tempNormal.dot(viewDirection);
        
        const combinedDepth = depth * (1.0 + Math.abs(facingRatio) * 0.5);
        
        depthData[i] = combinedDepth;
        minDepth = Math.min(minDepth, combinedDepth);
        maxDepth = Math.max(maxDepth, combinedDepth);
    }
    
    const depthRange = maxDepth - minDepth;
    const colorArray = geometry.attributes.color.array;
    
    const contrast = 4.0;
    const minGray = 0.02;
    const maxGray = 0.1;
    
    for (let i = 0; i < positionAttribute.count; i++) {
        const normalizedDepth = (depthData[i] - minDepth) / depthRange;
        let contrasted = (normalizedDepth - 0.5) * contrast + 0.5;
        contrasted = Math.max(0, Math.min(1, contrasted));
        
        const gray = maxGray - (contrasted * (maxGray - minGray));
        
        const idx = i * 3;
        colorArray[idx] = gray;
        colorArray[idx + 1] = gray;
        colorArray[idx + 2] = gray;
    }
    
    geometry.attributes.color.needsUpdate = true;
}

let time = 0;

const phase1 = Math.random() * Math.PI * 2;
const phase2 = Math.random() * Math.PI * 2;
const phase3 = Math.random() * Math.PI * 2;
const phase4 = Math.random() * Math.PI * 2;

const speed1 = 0.5 + Math.random() * 0.5;
const speed2 = 0.5 + Math.random() * 0.5;
const speed3 = 0.5 + Math.random() * 0.5;
const speed4 = 0.5 + Math.random() * 0.5;

const amp1 = 0.0002 + Math.random() * 0.0003;
const amp2 = 0.0002 + Math.random() * 0.0003;
const amp3 = 0.0002 + Math.random() * 0.0003;
const amp4 = 0.0002 + Math.random() * 0.0003;

function render(timestamp: number) {
    requestAnimationFrame(render);
    
    time += 0.001;
    
    const rotx = Math.sin(time * speed1 + phase1) * amp1 + 
                 Math.cos(time * speed2 + phase2) * amp2;
    
    const roty = Math.cos(time * speed3 + phase3) * amp3 + 
                 Math.sin(time * speed4 + phase4) * amp4;
    
    mesh.rotation.x += rotx;
    mesh.rotation.y += roty;
    
    // Throttle depth updates on mobile
    if (timestamp - lastDepthUpdate > depthUpdateInterval) {
        updateDepthColors();
        lastDepthUpdate = timestamp;
    }
    
    renderer.render(scene, camera);
}

let lastWidth = window.innerWidth;
let lastHeight = window.innerHeight;
let resizeTimeout: ReturnType<typeof setTimeout> | null = null;

function handleResize() {
    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight;

    const widthChanged = newWidth !== lastWidth;
    const heightDelta = Math.abs(newHeight - lastHeight);
    const significantHeightChange = heightDelta > 150;

    if (!widthChanged && !significantHeightChange)
        return;

    lastWidth = newWidth;
    lastHeight = newHeight;

    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(newWidth, newHeight);
}

window.addEventListener('resize', () => {
    if (resizeTimeout) clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(handleResize, 150);
});

requestAnimationFrame(render);