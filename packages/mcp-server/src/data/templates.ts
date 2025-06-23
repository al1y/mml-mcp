import type { MMLTemplates } from "../types.js"

/**
 * MML document templates for common 3D scenes
 * Ready-to-use complete MML documents with interactivity
 */
export const MML_TEMPLATES: MMLTemplates = {
  "basic-scene": `<m-group id="scene">
  <m-cube id="ground" 
          color="gray" 
          sx="10" sy="0.1" sz="10" 
          y="-0.5">
  </m-cube>
   
  <m-cube id="red-cube" 
          color="red" 
          y="1">
  </m-cube>
  
  <m-sphere id="blue-sphere" 
            color="blue" 
            x="3" y="1" 
            radius="0.8">
  </m-sphere>
  
  <m-light type="point" 
           color="white" 
           intensity="1" 
           x="0" y="5" z="0">
  </m-light>
</m-group>

<script>
  // Add interactivity
  const cube = document.getElementById('red-cube');
  const sphere = document.getElementById('blue-sphere');
  
  cube.addEventListener('click', () => {
    cube.setAttribute('color', 'green');
  });
  
  sphere.addEventListener('click', () => {
    const currentX = parseFloat(sphere.getAttribute('x') || '3');
    sphere.setAttribute('x', currentX + 1);
  });
</script>`,

  "spinning-dice": `<m-model id="dice" 
         src="https://public.mml.io/dice.glb" 
         collide="true"
         y="2"
         onclick="spinDice()">
</m-model>

<m-cube id="table" 
        color="brown" 
        sx="5" sy="0.2" sz="5" 
        y="0">
</m-cube>

<script>
  let rotationCounter = 0;
  
  function spinDice() {
    const dice = document.getElementById('dice');
    rotationCounter += 1;
    
    // Random rotation on each axis
    const rx = Math.random() * 360;
    const ry = Math.random() * 360; 
    const rz = Math.random() * 360;
    
    dice.setAttribute('rx', rx);
    dice.setAttribute('ry', ry);
    dice.setAttribute('rz', rz);
    
    console.log(\`Dice rolled \${rotationCounter} times!\`);
  }
</script>`,

  "interactive-gallery": `<m-group id="gallery">
  <!-- Gallery floor -->
  <m-cube id="floor" 
          color="#333333" 
          sx="20" sy="0.1" sz="20" 
          y="-0.5">
  </m-cube>
  
  <!-- Artwork displays -->
  <m-video id="video1" 
           src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
           width="4" height="2.25" 
           x="-6" y="2" z="-8"
           loop="true">
  </m-video>
  
  <m-model id="sculpture1" 
           src="https://public.mml.io/sculpture.glb"
           x="0" y="1" z="-8" 
           onclick="rotateSculpture()">
  </m-model>
  
  <m-label id="info-label" 
           text="Interactive 3D Gallery" 
           color="white" 
           font-size="48"
           width="6" height="1"
           x="6" y="3" z="-8">
  </m-label>
  
  <!-- Lighting -->
  <m-light type="point" 
           color="white" 
           intensity="0.8" 
           x="0" y="8" z="0">
  </m-light>
  
  <m-light type="point" 
           color="blue" 
           intensity="0.3" 
           x="-6" y="4" z="-6">
  </m-light>
</m-group>

<script>
  let sculptureRotation = 0;
  
  function rotateSculpture() {
    const sculpture = document.getElementById('sculpture1');
    sculptureRotation += 45;
    sculpture.setAttribute('ry', sculptureRotation);
  }
  
  // Auto-rotate sculpture slowly
  setInterval(() => {
    const sculpture = document.getElementById('sculpture1');
    sculptureRotation += 1;
    sculpture.setAttribute('ry', sculptureRotation);
  }, 100);
</script>`,

  "character-showcase": `<m-character id="avatar" 
            src="https://public.mml.io/avatar-base.glb"
            x="0" y="0" z="0">
  
  <!-- Character accessories -->
  <m-model id="hat" 
           src="https://public.mml.io/hat.glb"
           socket="head">
  </m-model>
  
  <m-model id="backpack" 
           src="https://public.mml.io/backpack.glb"
           socket="spine">
  </m-model>
</m-character>

<m-cube id="platform" 
        color="#4A4A4A" 
        sx="3" sy="0.3" sz="3" 
        y="-0.15">
</m-cube>

<m-light type="spotlight" 
         color="white" 
         intensity="1.2" 
         x="2" y="4" z="2">
</m-light>

<script>
  // Character animation controls
  const avatar = document.getElementById('avatar');
  let isWaving = false;
  
  avatar.addEventListener('click', () => {
    if (!isWaving) {
      isWaving = true;
      // Trigger wave animation
      avatar.setAttribute('animation', 'wave');
      setTimeout(() => {
        isWaving = false;
        avatar.removeAttribute('animation');
      }, 2000);
    }
  });
</script>`,
}
