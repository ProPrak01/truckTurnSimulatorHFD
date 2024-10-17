import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

const Visualizer = ({ truckModel, environmentModel, simulationData }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    console.log("Visualizer props:", {
      truckModel,
      environmentModel,
      simulationData,
    });

    if (!truckModel || !environmentModel || !simulationData) {
      console.warn(
        "Missing required props for Visualizer. Rendering empty canvas."
      );
      return;
    }

    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(800, 600);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);

    const camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 1000);
    camera.position.set(0, -50, 30);
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    const createBasicTruckMesh = () => {
      const truckGeometry = new THREE.BoxGeometry(
        truckModel.length,
        truckModel.width,
        truckModel.height
      );
      const truckMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
      return new THREE.Mesh(truckGeometry, truckMaterial);
    };

    const createWheels = (parentMesh) => {
      const wheelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.3, 32);
      const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
      return truckModel.wheels.map((wheel) => {
        const wheelMesh = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheelMesh.rotation.z = Math.PI / 2;
        parentMesh.add(wheelMesh);
        return wheelMesh;
      });
    };

    const setupSceneAndAnimate = (truckMesh, wheelMeshes) => {
      const terrainGeometry = new THREE.PlaneGeometry(1000, 1000, 100, 100);
      const terrainMaterial = new THREE.MeshPhongMaterial({
        color: 0x8b4513,
        wireframe: false,
      });
      const terrainMesh = new THREE.Mesh(terrainGeometry, terrainMaterial);
      terrainMesh.rotation.x = -Math.PI / 2;
      scene.add(terrainMesh);

      const terrainPositionAttribute = terrainGeometry.getAttribute("position");
      const terrainVertices = terrainPositionAttribute.array;

      let useDefaultTerrain = false;
      if (
        !environmentModel ||
        !environmentModel.terrain ||
        typeof environmentModel.terrain.getHeight !== "function"
      ) {
        console.warn(
          "Environment model or terrain height function is not available. Using flat terrain."
        );
        useDefaultTerrain = true;
      }

      for (let i = 0; i < terrainVertices.length; i += 3) {
        const x = terrainVertices[i];
        const y = terrainVertices[i + 1];
        if (!useDefaultTerrain) {
          try {
            terrainVertices[i + 2] = environmentModel.terrain.getHeight(x, y);
          } catch (error) {
            console.error("Error calling getHeight function:", error);
            useDefaultTerrain = true;
          }
        }
        if (useDefaultTerrain) {
          terrainVertices[i + 2] = 0;
        }
      }
      terrainPositionAttribute.needsUpdate = true;
      terrainGeometry.computeVertexNormals();

      const animate = () => {
        requestAnimationFrame(animate);

        if (simulationData.length > 0) {
          const latestData = simulationData[simulationData.length - 1];

          truckMesh.position.set(
            latestData.position.x,
            latestData.position.y,
            latestData.position.z
          );
          truckMesh.rotation.set(
            latestData.orientation.pitch,
            latestData.orientation.yaw,
            latestData.orientation.roll
          );

          truckModel.wheels.forEach((wheel, index) => {
            wheelMeshes[index].position.set(
              wheel.worldPosition.x - latestData.position.x,
              wheel.worldPosition.y - latestData.position.y,
              wheel.worldPosition.z - latestData.position.z
            );
          });

          camera.position.set(
            latestData.position.x - 50 * Math.cos(latestData.orientation.yaw),
            latestData.position.y - 50 * Math.sin(latestData.orientation.yaw),
            latestData.position.z + 30
          );
          camera.lookAt(
            latestData.position.x,
            latestData.position.y,
            latestData.position.z
          );
        }

        controls.update();
        renderer.render(scene, camera);
      };

      animate();
    };

    // Use basic geometry directly instead of trying to load a 3D model
    const truckMesh = createBasicTruckMesh();
    scene.add(truckMesh);
    const wheelMeshes = createWheels(truckMesh);
    setupSceneAndAnimate(truckMesh, wheelMeshes);

    return () => {
      scene.traverse((object) => {
        if (object.isMesh) {
          object.geometry.dispose();
          object.material.dispose();
        }
      });
      renderer.dispose();
    };
  }, [truckModel, environmentModel, simulationData]);

  return <canvas ref={canvasRef} />;
};

export default Visualizer;
