import type { MMLExamples } from "../types.js"

/**
 * Sample MML documents for different use cases
 * Focused code examples demonstrating specific MML capabilities
 */
export const MML_EXAMPLES: MMLExamples = {
  "simple-cube": `<m-cube id="my-cube" color="red" y="1"></m-cube>

<script>
  const cube = document.getElementById('my-cube');
  cube.addEventListener('click', () => {
    cube.setAttribute('color', 'blue'); 
  });
</script>`,

  "bouncing-sphere": `<m-sphere id="ball" 
          color="orange" 
          y="3" 
          radius="0.5">
</m-sphere>

<script>
  const ball = document.getElementById('ball');
  let direction = -1;
  let position = 3;
  
  setInterval(() => {
    position += direction * 0.1;
    
    if (position <= 0.5) {
      position = 0.5;
      direction = 1;
    } else if (position >= 3) {
      position = 3;
      direction = -1;
    }
    
    ball.setAttribute('y', position);
  }, 50);
</script>`,

  "weather-api": `<m-label id="weather-display" 
         text="Loading weather..." 
         color="white" 
         font-size="32"
         width="6" height="2"
         x="0" y="2" z="0">
</m-label>

<m-cube id="weather-cube" 
        color="blue" 
        y="0" 
        onclick="updateWeather()">
</m-cube>

<script>
  async function updateWeather() {
    try {
      const label = document.getElementById('weather-display');
      const cube = document.getElementById('weather-cube');
      
      label.setAttribute('text', 'Fetching weather...');
      
      // In a real implementation, you'd call a weather API
      const mockWeatherData = {
        temperature: Math.round(Math.random() * 30 + 10),
        condition: ['Sunny', 'Cloudy', 'Rainy', 'Snowy'][Math.floor(Math.random() * 4)]
      };
      
      setTimeout(() => {
        label.setAttribute('text', 
          \`\${mockWeatherData.condition}\\n\${mockWeatherData.temperature}°C\`);
        
        // Change cube color based on weather
        const colors = {
          'Sunny': 'yellow',
          'Cloudy': 'gray', 
          'Rainy': 'blue',
          'Snowy': 'white'
        };
        cube.setAttribute('color', colors[mockWeatherData.condition]);
      }, 1000);
      
    } catch (error) {
      console.error('Weather update failed:', error);
    }
  }
  
  // Auto-update weather every 30 seconds
  setInterval(updateWeather, 30000);
  updateWeather(); // Initial load
</script>`,
}
