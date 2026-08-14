import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ThreeCanvasProps {
    direction: 1 | -1;
}

export function ThreeCanvas({ direction }: ThreeCanvasProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const directionRef = useRef(direction);
    directionRef.current = direction;

    useEffect(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;
        const width = container.clientWidth || window.innerWidth;
        const height = container.clientHeight || window.innerHeight;

        // 1. Scene, Camera, Renderer
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        camera.position.z = 18;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        // 2. Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0x52c462, 1.8);
        dirLight.position.set(5, 10, 7);
        scene.add(dirLight);

        const pointLight = new THREE.PointLight(0xf1c40f, 2, 50);
        pointLight.position.set(-5, -5, 5);
        scene.add(pointLight);

        // 3. Central 3D Globe Sphere
        const globeGeo = new THREE.SphereGeometry(4.8, 64, 64);
        const globeMat = new THREE.MeshPhongMaterial({
            color: 0x1f6b2a,
            emissive: 0x092b0f,
            specular: 0x52c462,
            shininess: 40,
            wireframe: false,
            flatShading: false
        });
        const globe = new THREE.Mesh(globeGeo, globeMat);
        scene.add(globe);

        // Atmosphere Glow Shell
        const atmosGeo = new THREE.SphereGeometry(5.1, 64, 64);
        const atmosMat = new THREE.MeshBasicMaterial({
            color: 0x52c462,
            transparent: true,
            opacity: 0.15,
            side: THREE.BackSide
        });
        const atmosphere = new THREE.Mesh(atmosGeo, atmosMat);
        scene.add(atmosphere);

        // 4. Direction Orbital Rings
        const ringGeo = new THREE.TorusGeometry(6.2, 0.08, 16, 100);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0xf1c40f,
            transparent: true,
            opacity: 0.6
        });
        const orbitalRing = new THREE.Mesh(ringGeo, ringMat);
        orbitalRing.rotation.x = Math.PI / 3;
        scene.add(orbitalRing);

        // 5. Floating Stars/Particles Field
        const particleCount = 180;
        const particleGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const scales = new Float32Array(particleCount);

        for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 35;
            positions[i + 1] = (Math.random() - 0.5) * 35;
            positions[i + 2] = (Math.random() - 0.5) * 20;
            scales[i / 3] = Math.random() * 0.15 + 0.05;
        }

        particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const particleMat = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.25,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending
        });
        const particleSystem = new THREE.Points(particleGeo, particleMat);
        scene.add(particleSystem);

        // Mouse Parallax movement tracking
        let mouseX = 0;
        let mouseY = 0;

        const handleMouseMove = (e: MouseEvent) => {
            mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
            mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
        };

        window.addEventListener('mousemove', handleMouseMove);

        const handleResize = () => {
            if (!container) return;
            const w = container.clientWidth || window.innerWidth;
            const h = container.clientHeight || window.innerHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };

        window.addEventListener('resize', handleResize);

        // Render Animation Loop
        let animationFrameId: number;
        const clock = new THREE.Clock();

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            const elapsedTime = clock.getElapsedTime();

            // Rotate Globe & Ring based on direction
            const rotSpeed = 0.005 * directionRef.current;
            globe.rotation.y += rotSpeed;
            orbitalRing.rotation.z += rotSpeed * 1.5;
            particleSystem.rotation.y += rotSpeed * 0.3;

            // Camera Smooth Mouse Parallax Lerp
            camera.position.x += (mouseX * 2.5 - camera.position.x) * 0.05;
            camera.position.y += (-mouseY * 2.5 - camera.position.y) * 0.05;
            camera.lookAt(scene.position);

            renderer.render(scene, camera);
        };

        animate();

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('resize', handleResize);
            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
            renderer.dispose();
        };
    }, []);

    return (
        <div 
            ref={containerRef} 
            className="absolute inset-0 pointer-events-none z-0 overflow-hidden" 
        />
    );
}
