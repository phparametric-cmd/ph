
import React, { Suspense, useState, useCallback, useRef, useEffect, useImperativeHandle, useMemo } from 'react';
import { Canvas, ThreeEvent, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows, Billboard } from '@react-three/drei';
import House from './House';
import Plot from './Plot';
import DimensionLines from './DimensionLines';
import { HouseState } from '../types';
import * as THREE from 'three';
import { getTranslation } from '../services/i18n';

interface SceneProps {
  house: HouseState;
  setHouse: React.Dispatch<React.SetStateAction<HouseState>>;
  showHouse: boolean;
  isStyleStep: boolean;
  currentStep: number;
  onCaptureRef?: React.MutableRefObject<((mode?: 'current' | 'top') => string) | null>;
}

const getGarageWidth = (cars: number) => cars === 1 ? 4.5 : (cars === 2 ? 7.5 : 10.5);
const getCarportWidth = (cars: number) => cars === 1 ? 4 : (cars === 2 ? 7 : 10);

const WebGLLabel = ({ text, dims, position, scale = 1, isBuilding = false }: { text: string, dims?: string, position: [number, number, number], scale?: number, isBuilding?: boolean }) => {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const pillW = 420;
      const pillH = isBuilding ? 210 : 140;
      const x = (512 - pillW) / 2;
      const y = (256 - pillH) / 2;
      ctx.fillStyle = isBuilding ? 'rgba(255, 255, 255, 0.98)' : 'rgba(30, 41, 59, 0.98)';
      ctx.beginPath();
      ctx.roundRect(x, y, pillW, pillH, 20); 
      ctx.fill();
      if (isBuilding) { ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 8; ctx.stroke(); }
      ctx.fillStyle = isBuilding ? '#0f172a' : '#ffffff';
      ctx.font = `900 ${isBuilding ? '72px' : '56px'} sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (dims && isBuilding) {
        ctx.fillText(text.toUpperCase(), 256, 100);
        ctx.fillStyle = '#ff5f1f';
        ctx.font = '900 42px sans-serif'; 
        ctx.fillText(dims, 256, 175);
      } else {
        ctx.fillText(text, 256, 128);
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 16;
    return tex;
  }, [text, dims, isBuilding]);

  return (
    <group position={position}>
      <Billboard><mesh><planeGeometry args={[5.8 * scale, 2.9 * scale]} /><meshBasicMaterial map={texture} transparent alphaTest={0.5} depthWrite={false} /></mesh></Billboard>
    </group>
  );
};

const LandscapeObject = ({ 
  label, pos, color, args, onDragStart, isDragging, isStepActive, rotation = 0, isCustom = false
}: { 
  label: string, pos: [number, number], color: string, args: [number, number, number], 
  onDragStart: () => void, isDragging: boolean, isStepActive: boolean, rotation?: number, isCustom?: boolean
}) => {
  const actualWidth = rotation === 0 ? args[0] : args[2];
  const actualDepth = rotation === 0 ? args[2] : args[0];
  const dims = `${actualWidth.toFixed(1)}x${actualDepth.toFixed(1)}м`;
  return (
    <group position={[pos[0], args[1] / 2 + 0.01, pos[1]]} rotation={[0, rotation, 0]} onPointerDown={(e) => { if (isStepActive) { e.stopPropagation(); onDragStart(); } }}>
      <mesh castShadow receiveShadow><boxGeometry args={args} /><meshStandardMaterial color={isDragging ? "#ff5f1f" : color} roughness={0.6} transparent={isCustom} opacity={isCustom ? 0.8 : 1} /></mesh>
      <WebGLLabel isBuilding text={label} dims={dims} position={[0, args[1]/2 + 1.2, 0]} scale={0.85} />
    </group>
  );
};

const SceneContent = ({ house, setHouse, showHouse, currentStep, onCaptureRef }: any) => {
  const t = getTranslation(house.lang);
  const [draggingItem, setDraggingItem] = useState<string | null>(null);
  const orbitRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    if (onCaptureRef) {
      onCaptureRef.current = (mode: 'current' | 'top' = 'current') => {
        const originalPos = camera.position.clone();
        const originalTarget = orbitRef.current?.target.clone();

        if (mode === 'top') {
          camera.position.set(0, 100, 0);
          camera.lookAt(0, 0, 0);
          if (orbitRef.current) orbitRef.current.target.set(0, 0, 0);
        }

        gl.render(scene, camera);
        const dataUrl = gl.domElement.toDataURL('image/png');

        camera.position.copy(originalPos);
        if (orbitRef.current) {
          orbitRef.current.target.copy(originalTarget);
          orbitRef.current.update();
        }
        
        return dataUrl;
      };
    }
  }, [gl, scene, camera, onCaptureRef]);

  const handleDragStart = (id: string) => {
    setDraggingItem(id);
    if (orbitRef.current) orbitRef.current.enabled = false;
  };

  const handleDragEnd = useCallback(() => {
    setDraggingItem(null);
    if (orbitRef.current) orbitRef.current.enabled = true;
  }, []);

  useEffect(() => {
    if (draggingItem) {
      window.addEventListener('pointerup', handleDragEnd);
      return () => window.removeEventListener('pointerup', handleDragEnd);
    }
  }, [draggingItem, handleDragEnd]);

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!draggingItem) return;
    const { x, z } = e.point;
    const pW = house.plotWidth / 2;
    const pL = house.plotLength / 2;
    const margin = 1;
    const limitedX = Math.max(-pW + margin, Math.min(pW - margin, x));
    const limitedZ = Math.max(-pL + margin, Math.min(pL - margin, z));

    setHouse((prev: HouseState) => {
      const updates: any = {};
      if (draggingItem === 'house') { updates.housePosX = limitedX; updates.housePosZ = limitedZ; }
      else if (draggingItem === 'terrace') { updates.terracePosX = limitedX - prev.housePosX; updates.terracePosZ = limitedZ - prev.housePosZ; }
      else if (draggingItem === 'pool') { updates.poolPosX = limitedX; updates.poolPosZ = limitedZ; }
      else if (draggingItem === 'garage') { updates.garagePosX = limitedX; updates.garagePosZ = limitedZ; }
      else if (draggingItem === 'carport') { updates.carportPosX = limitedX; updates.carportPosZ = limitedZ; }
      else if (draggingItem === 'bath') { updates.bathPosX = limitedX; updates.bathPosZ = limitedZ; }
      else if (draggingItem === 'bbq') { updates.bbqPosX = limitedX; updates.bbqPosZ = limitedZ; }
      else if (draggingItem === 'customObj') { updates.customObjPosX = limitedX; updates.customObjPosZ = limitedZ; }
      return { ...prev, ...updates };
    });
  };

  const isMovable = currentStep <= 4;

  const Pillar = ({ pos }: { pos: [number, number, number] }) => (
    <mesh position={pos}>
      <boxGeometry args={[0.2, 3, 0.2]} />
      <meshStandardMaterial color={house.wallColor} />
    </mesh>
  );

  return (
    <>
      {/* Камера отодвинута назад для мобильной версии, чтобы видеть весь участок [80, 65, 80] вместо [50, 40, 50] */}
      <PerspectiveCamera ref={cameraRef} makeDefault position={[80, 65, 80]} fov={30} />
      <OrbitControls ref={orbitRef} minDistance={20} maxDistance={200} maxPolarAngle={Math.PI / 2.1} makeDefault />
      
      <Plot width={house.plotWidth} length={house.plotLength} gatePosX={house.gatePosX} onClick={() => {}} onPointerMove={handlePointerMove} />
      
      {showHouse && (
        <group>
          <group onPointerDown={(e) => { if (isMovable) { e.stopPropagation(); handleDragStart('house'); } }}>
            <House state={house} />
            <WebGLLabel isBuilding text={house.lang === 'ru' ? 'Дом' : (house.lang === 'en' ? 'House' : 'Үй')} dims={`${house.houseWidth}x${house.houseLength}м`} position={[house.housePosX, house.floors * 3.2 + 2.5, house.housePosZ]} scale={1.4} />
          </group>
          
          {house.hasTerrace && (
             <group position={[house.housePosX + house.terracePosX, 0, house.housePosZ + house.terracePosZ]} onPointerDown={(e) => { if (isMovable) { e.stopPropagation(); handleDragStart('terrace'); } }}>
                <mesh position={[0, 0.15, 0]} receiveShadow><boxGeometry args={[house.terraceWidth, 0.2, house.terraceDepth]} /><meshStandardMaterial color="#e2e8f0" /></mesh>
                <mesh position={[0, 3, 0]} castShadow><boxGeometry args={[house.terraceWidth + 0.2, 0.15, house.terraceDepth + 0.2]} /><meshStandardMaterial color={house.roofColor} /></mesh>
                <Pillar pos={[house.terraceWidth/2 - 0.2, 1.5, house.terraceDepth/2 - 0.2]} />
                <Pillar pos={[-house.terraceWidth/2 + 0.2, 1.5, house.terraceDepth/2 - 0.2]} />
                <Pillar pos={[house.terraceWidth/2 - 0.2, 1.5, -house.terraceDepth/2 + 0.2]} />
                <Pillar pos={[-house.terraceWidth/2 + 0.2, 1.5, -house.terraceDepth/2 + 0.2]} />
                <WebGLLabel isBuilding text={t.terrace} dims={`${house.terraceWidth}x${house.terraceDepth}м`} position={[0, 4.2, 0]} scale={0.85} />
             </group>
          )}
        </group>
      )}

      {house.hasPool && <LandscapeObject label={t.pool} pos={[house.poolPosX, house.poolPosZ]} color="#38bdf8" args={[house.poolWidth, 0.2, house.poolDepth]} onDragStart={() => handleDragStart('pool')} isDragging={draggingItem === 'pool'} isStepActive={isMovable} />}
      {house.hasBath && <LandscapeObject label={t.bath} pos={[house.bathPosX, house.bathPosZ]} color="#7c2d12" args={[house.bathWidth, 2.8, house.bathDepth]} onDragStart={() => handleDragStart('bath')} isDragging={draggingItem === 'bath'} isStepActive={isMovable} />}
      {house.hasBBQ && <LandscapeObject label={house.bbqLabel || t.bbq} pos={[house.bbqPosX, house.bbqPosZ]} color="#334155" args={[house.bbqWidth, 1.2, house.bbqDepth]} onDragStart={() => handleDragStart('bbq')} isDragging={draggingItem === 'bbq'} isStepActive={isMovable} />}
      {house.hasCustomObj && <LandscapeObject isCustom label={house.customObjLabel || t.hozblock} pos={[house.customObjPosX, house.customObjPosZ]} color="#94a3b8" args={[house.customObjWidth, 2.5, house.customObjDepth]} onDragStart={() => handleDragStart('customObj')} isDragging={draggingItem === 'customObj'} isStepActive={isMovable} />}
      
      {house.hasGarage && <LandscapeObject rotation={house.garageRotation} label={t.garage} pos={[house.garagePosX, house.garagePosZ]} color={house.wallColor} args={[getGarageWidth(house.garageCars), 3.2, 6.5]} onDragStart={() => handleDragStart('garage')} isDragging={draggingItem === 'garage'} isStepActive={isMovable} />}
      
      {house.hasCarport && (
        <group position={[house.carportPosX, 0, house.carportPosZ]} rotation={[0, house.carportRotation, 0]} onPointerDown={(e) => { if (isMovable) { e.stopPropagation(); handleDragStart('carport'); } }}>
          <mesh position={[0, 2.8, 0]} castShadow>
            <boxGeometry args={[getCarportWidth(house.carportCars), 0.1, 6]} />
            <meshStandardMaterial color={draggingItem === 'carport' ? "#ff5f1f" : house.roofColor} />
          </mesh>
          <Pillar pos={[getCarportWidth(house.carportCars)/2 - 0.2, 1.4, 2.8]} />
          <Pillar pos={[-getCarportWidth(house.carportCars)/2 + 0.2, 1.4, 2.8]} />
          <Pillar pos={[getCarportWidth(house.carportCars)/2 - 0.2, 1.4, -2.8]} />
          <Pillar pos={[-getCarportWidth(house.carportCars)/2 + 0.2, 1.4, -2.8]} />
          <WebGLLabel isBuilding text={t.carport} dims={`${getCarportWidth(house.carportCars)}x6м`} position={[0, 3.8, 0]} scale={0.85} />
        </group>
      )}

      <DimensionLines currentStep={currentStep} plotWidth={house.plotWidth} plotLength={house.plotLength} houseWidth={house.houseWidth} houseLength={house.houseLength} housePosX={house.housePosX} housePosZ={house.housePosZ} showHouse={showHouse} />
    </>
  );
};

const Scene: React.FC<SceneProps> = (props) => {
  return (
    <div className="w-full h-full bg-[#f8fafc]">
      <Canvas shadows gl={{ antialias: true, preserveDrawingBuffer: true }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[50, 80, 50]} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} />
        <Suspense fallback={null}>
          <SceneContent {...props} />
          <Environment preset="apartment" />
        </Suspense>
        <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={150} blur={2} far={10} color="#000" />
      </Canvas>
    </div>
  );
};

export default Scene;
